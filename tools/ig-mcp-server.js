#!/usr/bin/env node
/**
 * Instagram MCP server.
 *
 * Exposes the agents (optimize, pick photo, design, publish, metrics, review,
 * full pipeline) as MCP tools for VS Code and Claude Desktop. Publishing and
 * metrics use the Instagram Graph API with IG_ACCESS_TOKEN / IG_USER_ID from .env.
 *
 * Real API docs:
 *   https://developers.facebook.com/docs/instagram-api/
 *
 * Run manually:  node ig-mcp-server.js
 * VS Code launches it automatically via .vscode/mcp.json.
 */

// MCP uses stdout for JSON-RPC messages. Any stray console.log would corrupt
// the protocol stream and cause Claude Desktop to disconnect with a
// "not valid JSON" error. Redirect all stdout logging to stderr.
console.log = (...args) => console.error(...args);
console.info = (...args) => console.error(...args);

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fillTemplate, exportDesign } from './agents/canva.js';
import { runOptimizer }  from './agents/optimizer.js';
import { publishPost, publishImage } from './agents/publisher.js';
import { runReviewer }   from './agents/reviewer.js';
import { designPost }    from './agents/canva-designer.js';
import { getLatestPhotoUrl, getAlbumPhotoUrls } from './agents/google-photos.js';
import { pickBestPhoto } from './agents/photo-picker.js';
import { markImageUsed } from './agents/google-photos-album.js';
import { REPO_ROOT }     from './agents/llm.js';
import { graphGet } from './agents/graph.js';
import { sendAlert }   from './agents/notify.js';

const ROOT = process.env.IG_DATA_DIR
  || path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', 'instagram');
const METRICS_DIR = path.join(ROOT, 'metrics');

const IG_TOKEN   = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;

const server = new Server(
  { name: 'instagram', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_post',
      description: 'Publish an Instagram post. Returns the new post id.',
      inputSchema: {
        type: 'object',
        properties: {
          caption: { type: 'string' },
          image_url: { type: 'string', description: 'Public URL of the image' },
        },
        required: ['caption', 'image_url'],
      },
    },
    {
      name: 'get_post_metrics',
      description: 'Fetch engagement metrics for a post id.',
      inputSchema: {
        type: 'object',
        properties: { post_id: { type: 'string' } },
        required: ['post_id'],
      },
    },
    {
      name: 'canva_fill_template',
      description: 'Autofill a Canva brand template with text fields and return the new design id.',
      inputSchema: {
        type: 'object',
        properties: {
          template_id: { type: 'string', description: 'Canva template id (from template URL)' },
          headline:    { type: 'string', description: 'Main headline text for the design' },
          tagline:     { type: 'string', description: 'Supporting tagline / subtext (optional)' },
        },
        required: ['template_id', 'headline'],
      },
    },
    {
      name: 'canva_export',
      description: 'Export a Canva design as a PNG and return a public image URL.',
      inputSchema: {
        type: 'object',
        properties: {
          design_id: { type: 'string', description: 'Design id returned by canva_fill_template' },
        },
        required: ['design_id'],
      },
    },
    // ── Per-agent tools ─────────────────────────────────────────────────────
    {
      name: 'optimize_post',
      description: 'Run the 3-round optimizer loop to draft the best post for a topic. Returns the saved post file path.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Subject or theme for the Instagram post' },
        },
        required: ['topic'],
      },
    },
    {
      name: 'design_post',
      description: 'Auto-fill a Canva template using a saved post draft and return a public image URL. Requires CANVA_* env vars.',
      inputSchema: {
        type: 'object',
        properties: {
          post_file: { type: 'string', description: 'Repo-relative path to the post markdown file, e.g. instagram/posts/2026-05-20.md' },
        },
        required: ['post_file'],
      },
    },
    {
      name: 'publish_post',
      description: 'Publish a post draft to Instagram. Returns the post_id.',
      inputSchema: {
        type: 'object',
        properties: {
          post_file: { type: 'string', description: 'Repo-relative path to the post markdown file' },
          image_url: { type: 'string', description: 'Public image URL to attach (required by Instagram Graph API)' },
        },
        required: ['post_file'],
      },
    },
    {
      name: 'review_post',
      description: 'Read metrics for a published post and append new lessons to instagram/lessons.md.',
      inputSchema: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'Instagram post id (must have a matching instagram/metrics/<post_id>.json file)' },
        },
        required: ['post_id'],
      },
    },
    // ── Photo source tools ──────────────────────────────────────────────────
    {
      name: 'pick_photo_from_album',
      description: 'Pick the best photo from a Google Photos shared album using AI vision. Returns a full-resolution image URL.',
      inputSchema: {
        type: 'object',
        properties: {
          share_url:  { type: 'string', description: 'photos.app.goo.gl or photos.google.com/share URL (defaults to GOOGLE_ALBUM_URL in .env)' },
          max_photos: { type: 'number', description: 'Max candidates to send to the LLM (default 10)' },
        },
      },
    },
    {
      name: 'get_latest_google_photo',
      description: 'Fetch the URL of the most recent photo from the authenticated Google Photos library. Requires google-photos-auth.js to have been run.',
      inputSchema: {
        type: 'object',
        properties: {
          album_id: { type: 'string', description: 'Optional album id; if set, returns the latest photo from that album instead of the full library.' },
        },
      },
    },
    // ── End-to-end pipeline ─────────────────────────────────────────────────
    {
      name: 'auto_pipeline',
      description: 'Run the full optimize → (photo pick) → design → publish → review pipeline in one call. Mirrors tools/auto-pipeline.js.',
      inputSchema: {
        type: 'object',
        properties: {
          topic:             { type: 'string',  description: 'Subject or theme for the post' },
          image_url:         { type: 'string',  description: 'Optional preselected public image URL (skips photo selection)' },
          google_album_url:  { type: 'string',  description: 'Optional Google Photos shared album URL (defaults to GOOGLE_ALBUM_URL in .env) — best photo will be picked via AI vision' },
          google_photo:      { type: 'string',  description: 'Optional Google Photos API source: "latest" or "album:<albumId>"' },
          max_photos:        { type: 'number',  description: 'Max album candidates for the picker (default 10)' },
          wait_hours:        { type: 'number',  description: 'Hours to poll for metrics before giving up (default 0 = single check)' },
          poll_seconds:      { type: 'number',  description: 'Metrics poll interval in seconds (default 30)' },
          skip_design:       { type: 'boolean', description: 'Skip the Canva design step' },
          skip_publish:      { type: 'boolean', description: 'Stop after the draft (no publish, no review)' },
          skip_review:       { type: 'boolean', description: 'Stop after publish (no metrics wait, no review)' },
        },
        required: ['topic'],
      },
    },
  ],
}));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForMetrics(postId, { waitHours, pollSeconds }) {
  const file = path.join(REPO_ROOT, 'instagram', 'metrics', `${postId}.json`);
  const deadline = Date.now() + waitHours * 3600 * 1000;
  while (true) {
    try { await fs.access(file); return file; } catch {}
    if (Date.now() >= deadline) return null;
    await sleep(pollSeconds * 1000);
  }
}

async function handleTool(req) {
  const { name, arguments: args } = req.params;

  if (name === 'create_post') {
    if (!IG_TOKEN || !IG_USER_ID) {
      throw new Error('IG_ACCESS_TOKEN and IG_USER_ID must be set in environment.');
    }

    // Same create → wait → publish flow (with safe retries) as publish_post.
    const published = await publishImage({ caption: args.caption, imageUrl: args.image_url });
    if (!published.post_id) {
      throw new Error(`Publish failed: ${JSON.stringify(published)}`);
    }
    await markImageUsed(args.image_url);

    return {
      content: [{ type: 'text', text: JSON.stringify({ post_id: published.post_id }) }],
    };
  }

  if (name === 'get_post_metrics') {
    if (!IG_TOKEN) {
      throw new Error('IG_ACCESS_TOKEN must be set in environment.');
    }

    // Fetch likes + comments count from the media object. graphGet throws on
    // API errors (e.g. expired token) so we never cache fake zeros.
    const media = await graphGet(`/${args.post_id}`, {
      fields: 'like_count,comments_count',
    });

    // Fetch reach + saves from insights. If insights are unavailable (missing
    // permission, post too new), record null rather than 0.
    let insights = null;
    let insightsNote = null;
    try {
      insights = await graphGet(`/${args.post_id}/insights`, {
        metric: 'reach,saved',
      });
    } catch (e) {
      insightsNote = `insights unavailable: ${e.message}`;
      console.error(`[get_post_metrics] ${insightsNote}`);
    }

    const getValue = (metric) =>
      insights?.data?.find((d) => d.name === metric)?.values?.[0]?.value ?? null;

    const result = {
      post_id:  args.post_id,
      likes:    media.like_count    ?? 0,
      comments: media.comments_count ?? 0,
      reach:    getValue('reach'),
      saves:    getValue('saved'),
      ...(insightsNote ? { note: insightsNote } : {}),
    };

    // Also cache to local metrics file for the reviewer agent
    await fs.mkdir(METRICS_DIR, { recursive: true });
    await fs.writeFile(
      path.join(METRICS_DIR, `${args.post_id}.json`),
      JSON.stringify(result, null, 2)
    );

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'canva_fill_template') {
    const designId = await fillTemplate(args.template_id, {
      headline: args.headline,
      ...(args.tagline ? { tagline: args.tagline } : {}),
    });
    return { content: [{ type: 'text', text: JSON.stringify({ design_id: designId }) }] };
  }

  if (name === 'canva_export') {
    const imageUrl = await exportDesign(args.design_id);
    return { content: [{ type: 'text', text: JSON.stringify({ image_url: imageUrl }) }] };
  }

  if (name === 'optimize_post') {
    const { savedPath } = await runOptimizer(args.topic);
    return { content: [{ type: 'text', text: JSON.stringify({ post_file: savedPath }) }] };
  }

  if (name === 'design_post') {
    const imageUrl = await designPost(args.post_file);
    return { content: [{ type: 'text', text: JSON.stringify({ image_url: imageUrl }) }] };
  }

  if (name === 'publish_post') {
    const result = await publishPost({ postFile: args.post_file, imageUrl: args.image_url });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'review_post') {
    await runReviewer(args.post_id);
    return { content: [{ type: 'text', text: JSON.stringify({ reviewed: true, post_id: args.post_id }) }] };
  }

  if (name === 'pick_photo_from_album') {
    const shareUrl = args.share_url || process.env.GOOGLE_ALBUM_URL;
    if (!shareUrl) throw new Error('share_url is required (or set GOOGLE_ALBUM_URL in .env)');
    const imageUrl = await pickBestPhoto(shareUrl, { maxPhotos: args.max_photos ?? 10 });
    return { content: [{ type: 'text', text: JSON.stringify({ image_url: imageUrl }) }] };
  }

  if (name === 'get_latest_google_photo') {
    let imageUrl;
    if (args.album_id) {
      const urls = await getAlbumPhotoUrls(args.album_id, 1);
      imageUrl = urls[0];
    } else {
      imageUrl = await getLatestPhotoUrl();
    }
    return { content: [{ type: 'text', text: JSON.stringify({ image_url: imageUrl }) }] };
  }

  if (name === 'auto_pipeline') {
    const log = (m) => console.error(`[pipeline] ${m}`);
    const {
      topic, image_url, google_album_url = process.env.GOOGLE_ALBUM_URL, google_photo,
      max_photos = 10, wait_hours = 0, poll_seconds = 30,
      skip_design = false, skip_publish = false, skip_review = false,
    } = args;

    if (!topic) throw new Error('topic is required');

    log('Step 1: optimize');
    const { savedPath } = await runOptimizer(topic);

    let imageUrl = image_url;

    if (!imageUrl && google_album_url) {
      log('Step 1b: pick best photo from Google Photos album');
      try {
        imageUrl = await pickBestPhoto(google_album_url, { maxPhotos: max_photos });
      } catch (e) { log(`photo picker failed: ${e.message}`); await sendAlert('Instagram agent: photo picker failed', e.message); }
    }

    if (!imageUrl && google_photo) {
      log('Step 1b: fetch from Google Photos API');
      try {
        if (google_photo === 'latest') imageUrl = await getLatestPhotoUrl();
        else if (google_photo.startsWith('album:')) {
          const urls = await getAlbumPhotoUrls(google_photo.slice('album:'.length), 1);
          imageUrl = urls[0];
        }
      } catch (e) { log(`Google Photos fetch failed: ${e.message}`); await sendAlert('Instagram agent: Google Photos fetch failed', e.message); }
    }

    if (!skip_design && !imageUrl && process.env.CANVA_CLIENT_ID && process.env.CANVA_TEMPLATE_ID) {
      log('Step 2: Canva design');
      try { imageUrl = await designPost(savedPath); }
      catch (e) { log(`Canva design failed: ${e.message}`); await sendAlert('Instagram agent: Canva design failed', e.message); }
    }

    if (skip_publish) {
      return { content: [{ type: 'text', text: JSON.stringify({ post_file: savedPath, image_url: imageUrl, stopped_after: 'draft' }) }] };
    }

    log('Step 3: publish');
    const { post_id } = await publishPost({ postFile: savedPath, imageUrl });

    if (skip_review) {
      return { content: [{ type: 'text', text: JSON.stringify({ post_file: savedPath, image_url: imageUrl, post_id, stopped_after: 'publish' }) }] };
    }

    log('Step 4: wait for metrics');
    const metricsFile = await waitForMetrics(post_id, { waitHours: wait_hours, pollSeconds: poll_seconds });
    if (!metricsFile) {
      return { content: [{ type: 'text', text: JSON.stringify({ post_file: savedPath, image_url: imageUrl, post_id, stopped_after: 'no_metrics' }) }] };
    }

    log('Step 5: review');
    await runReviewer(post_id);

    return { content: [{ type: 'text', text: JSON.stringify({ post_file: savedPath, image_url: imageUrl, post_id, reviewed: true }) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    return await handleTool(req);
  } catch (e) {
    await sendAlert(`Instagram agent: ${req.params.name} failed`, e.message);
    throw e;
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
