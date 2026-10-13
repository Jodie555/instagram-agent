/**
 * Publisher agent — publishes a post draft to Instagram via the Graph API.
 *
 * Required env vars for real publishing:
 *   IG_ACCESS_TOKEN  — long-lived Instagram Graph API token
 *   IG_USER_ID       — Instagram Business/Creator account id
 *
 * Falls back to stub mode if env vars are not set.
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readRepoFile, writeRepoFile, REPO_ROOT } from './llm.js';
import { GRAPH_BASE, graphGet } from './graph.js';
import { fetchWithRetry } from './net.js';
import { markImageUsed } from './google-photos-album.js';

/**
 * Pull caption + image prompt out of a post markdown file.
 */
export function parsePostMarkdown(md) {
  const captionMatch = md.match(/##\s*Caption\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  const hashtagMatch = md.match(/##\s*Hashtags\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  const imageMatch = md.match(/##\s*Image prompt\s*\n([\s\S]*?)(?=\n##\s|$)/i);

  const caption = (captionMatch?.[1] || '').trim();
  const hashtags = (hashtagMatch?.[1] || '').trim();
  const imagePrompt = (imageMatch?.[1] || '').trim();

  const fullCaption = hashtags ? `${caption}\n\n.\n.\n.\n${hashtags}` : caption;

  return { caption, hashtags, imagePrompt, fullCaption };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait until Instagram has finished fetching/processing the image in a media
 * container. Publishing before it is FINISHED fails with "Media ID is not available".
 */
async function waitForContainer(containerId, { timeoutMs = 120_000, pollMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const { status_code, status } = await graphGet(`/${containerId}`, { fields: 'status_code,status' });
    if (status_code === 'FINISHED' || status_code === 'PUBLISHED') return status_code;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') {
      throw new Error(`IG media container ${containerId} is ${status_code}: ${status || 'no details'} (is the image URL public and a JPEG?)`);
    }
    if (Date.now() >= deadline) throw new Error(`IG media container ${containerId} still ${status_code} after ${timeoutMs / 1000}s`);
    await sleep(pollMs);
  }
}

/** After a container shows PUBLISHED, find the new post's id by matching its caption. */
async function findPublishedPostId(userId, caption) {
  const { data = [] } = await graphGet(`/${userId}/media`, { fields: 'id,caption', limit: 5 });
  return data.find((m) => (m.caption || '').trim() === caption.trim())?.id;
}

/**
 * Publish an image post to Instagram via the Graph API.
 *
 * Flow:
 *   1. POST /{ig-user-id}/media          → creates a media container (retried; an unused
 *                                           container just expires, so a duplicate is harmless)
 *   2. GET  /{container-id}?fields=status_code → wait until FINISHED
 *   3. POST /{ig-user-id}/media_publish  → publishes the container. NOT blindly retried:
 *      before each retry we ask Instagram whether the container is already PUBLISHED,
 *      so a lost response can never produce a duplicate post.
 *
 * Required env vars:
 *   IG_ACCESS_TOKEN  — long-lived Instagram Graph API token
 *   IG_USER_ID       — Instagram Business/Creator account id
 *
 * imageUrl must be a publicly accessible URL (Instagram fetches it server-side).
 */
export async function publishImage({ caption, imageUrl, publishAttempts = 3 }) {
  const token = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;

  if (!token || !userId) {
    const post_id = `stub_${Date.now()}`;
    console.log(`[publisher] STUB mode (IG_ACCESS_TOKEN or IG_USER_ID not set). Generated id: ${post_id}`);
    return { post_id, stub: true };
  }

  if (!imageUrl) {
    throw new Error('No image URL — refusing to publish. Pick a photo (or design one) first.');
  }

  const base = GRAPH_BASE;

  // Step 1 — create media container
  console.log('[publisher] Creating media container...');
  const containerRes = await fetchWithRetry(`${base}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: token,
    }),
  }, { label: 'IG create container' });
  const containerData = await containerRes.json();
  if (!containerRes.ok || containerData.error) {
    throw new Error(`IG media container error: ${JSON.stringify(containerData.error ?? containerData)}`);
  }
  const containerId = containerData.id;
  console.log(`[publisher] Container created: ${containerId}`);

  // Step 2 — wait for Instagram to process the image
  await waitForContainer(containerId);

  // Step 3 — publish the container
  for (let attempt = 1; ; attempt++) {
    if (attempt > 1) {
      // The previous attempt may have succeeded even though we saw an error.
      const { status_code } = await graphGet(`/${containerId}`, { fields: 'status_code' });
      if (status_code === 'PUBLISHED') {
        const post_id = await findPublishedPostId(userId, caption);
        if (!post_id) throw new Error(`IG post was published (container ${containerId}) but its post id could not be found — check the account before re-running.`);
        console.log('[publisher] Earlier publish attempt went through.');
        return { post_id, stub: false };
      }
    }

    console.log(`[publisher] Publishing container (attempt ${attempt}/${publishAttempts})...`);
    let publishRes;
    let publishData;
    let networkError;
    try {
      publishRes = await fetch(`${base}/${userId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: token,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      publishData = await publishRes.json();
    } catch (e) {
      networkError = e;
    }

    if (!networkError && publishRes.ok && !publishData.error) {
      return { post_id: publishData.id, stub: false };
    }

    const err = publishData?.error;
    // 9007 = media not ready yet; is_transient = Meta says try again; 5xx = server trouble.
    const transient = networkError || publishRes.status >= 500 || err?.is_transient || err?.code === 9007 || err?.code === 2 || err?.code === 4;
    const detail = networkError ? networkError.message : JSON.stringify(err ?? publishData);
    if (!transient || attempt >= publishAttempts) {
      throw new Error(`IG publish error after ${attempt} attempt(s): ${detail}`);
    }
    console.error(`[publisher] publish attempt ${attempt} failed (${detail}) — checking and retrying in ${5 * attempt}s`);
    await sleep(5000 * attempt);
  }
}

/**
 * Publish a post markdown file. `imageUrl` is required by the IG Graph API
 * (and ignored in stub mode). Returns { post_id, postFile }.
 */
export async function publishPost({ postFile, imageUrl }) {
  const md = await readRepoFile(postFile);
  if (!md) throw new Error(`Post file not found: ${postFile}`);

  // Prevent re-publishing a post that already has a real (non-stub) post_id.
  const existingId = md.match(/\*\*post_id:\*\*\s*`([^`]+)`/);
  if (existingId && !existingId[1].startsWith('stub_')) {
    throw new Error(`Post ${postFile} was already published (post_id: ${existingId[1]}). Delete the Published block to force re-publish.`);
  }

  const { fullCaption } = parsePostMarkdown(md);
  if (!fullCaption) throw new Error(`No caption found in ${postFile}`);

  console.log(`[publisher] publishing ${postFile}...`);
  const result = await publishImage({ caption: fullCaption, imageUrl });
  if (!result.stub) await markImageUsed(imageUrl);

  // Annotate the post file with the published id for traceability.
  const annotated = `${md}\n\n---\n**Published:** ${new Date().toISOString()}  \n**post_id:** \`${result.post_id}\`\n`;
  await writeRepoFile(postFile, annotated);

  console.log(`[publisher] published. post_id=${result.post_id}`);
  return { ...result, postFile };
}

// CLI entry point
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const postFile = process.argv[2];
  const imageUrl = process.argv[3];
  if (!postFile) {
    console.error('Usage: node publisher.js <postFile> [imageUrl]');
    process.exit(1);
  }
  publishPost({ postFile, imageUrl })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => { console.error(e); process.exit(1); });
}
