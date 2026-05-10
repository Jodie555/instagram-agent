#!/usr/bin/env node
/**
 * Minimal Instagram MCP server (stub).
 *
 * Exposes two tools to VS Code chat modes:
 *   - create_post(caption, image_url)        -> { post_id }
 *   - get_post_metrics(post_id)              -> { likes, comments, reach, saves }
 *
 * The implementations are STUBS that read/write local JSON files so you can
 * test the full agent loop without real Instagram credentials. Replace the
 * marked sections with calls to the Instagram Graph API when ready.
 *
 * Real API docs:
 *   https://developers.facebook.com/docs/instagram-api/
 *
 * Run manually:  node ig-mcp-server.js
 * VS Code launches it automatically via .vscode/mcp.json.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fillTemplate, exportDesign } from './agents/canva.js';

const ROOT = process.env.IG_DATA_DIR
  || path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', 'instagram');
const METRICS_DIR = path.join(ROOT, 'metrics');

const IG_TOKEN   = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

async function graphPost(endpoint, params) {
  const url = new URL(`${GRAPH_BASE}${endpoint}`);
  Object.entries({ ...params, access_token: IG_TOKEN }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );
  const res = await fetch(url.toString(), { method: 'POST' });
  return res.json();
}

async function graphGet(endpoint, params = {}) {
  const url = new URL(`${GRAPH_BASE}${endpoint}`);
  Object.entries({ ...params, access_token: IG_TOKEN }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );
  const res = await fetch(url.toString());
  return res.json();
}

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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === 'create_post') {
    if (!IG_TOKEN || !IG_USER_ID) {
      throw new Error('IG_ACCESS_TOKEN and IG_USER_ID must be set in environment.');
    }

    // Step 1 — create media container
    const container = await graphPost(`/${IG_USER_ID}/media`, {
      image_url: args.image_url,
      caption:   args.caption,
    });
    if (!container.id) {
      throw new Error(`Container creation failed: ${JSON.stringify(container)}`);
    }

    // Step 2 — publish the container
    const published = await graphPost(`/${IG_USER_ID}/media_publish`, {
      creation_id: container.id,
    });
    if (!published.id) {
      throw new Error(`Publish failed: ${JSON.stringify(published)}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ post_id: published.id }) }],
    };
  }

  if (name === 'get_post_metrics') {
    if (!IG_TOKEN) {
      throw new Error('IG_ACCESS_TOKEN must be set in environment.');
    }

    // Fetch likes + comments count from the media object
    const media = await graphGet(`/${args.post_id}`, {
      fields: 'like_count,comments_count',
    });

    // Fetch reach + saves from insights
    const insights = await graphGet(`/${args.post_id}/insights`, {
      metric: 'reach,saved',
    });

    const getValue = (metric) =>
      insights?.data?.find((d) => d.name === metric)?.values?.[0]?.value ?? 0;

    const result = {
      post_id:  args.post_id,
      likes:    media.like_count    ?? 0,
      comments: media.comments_count ?? 0,
      reach:    getValue('reach'),
      saves:    getValue('saved'),
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

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
