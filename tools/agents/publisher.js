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

/**
 * Publish a post to Instagram via the Graph API.
 *
 * Flow:
 *   1. POST /{ig-user-id}/media          → creates a media container
 *   2. POST /{ig-user-id}/media_publish  → publishes the container
 *
 * Required env vars:
 *   IG_ACCESS_TOKEN  — long-lived Instagram Graph API token
 *   IG_USER_ID       — Instagram Business/Creator account id
 *
 * imageUrl must be a publicly accessible URL (Instagram fetches it server-side).
 * If no imageUrl is provided, falls back to stub mode.
 */
async function publishToInstagram({ caption, imageUrl }) {
  const token = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;

  if (!token || !userId) {
    const post_id = `stub_${Date.now()}`;
    console.log(`[publisher] STUB mode (IG_ACCESS_TOKEN or IG_USER_ID not set). Generated id: ${post_id}`);
    return { post_id, stub: true };
  }

  const base = 'https://graph.facebook.com/v19.0';

  // Step 1 — create media container
  console.log('[publisher] Creating media container...');
  const containerRes = await fetch(`${base}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: token,
    }),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok || containerData.error) {
    throw new Error(`IG media container error: ${JSON.stringify(containerData.error ?? containerData)}`);
  }
  const containerId = containerData.id;
  console.log(`[publisher] Container created: ${containerId}`);

  // Step 2 — publish the container
  console.log('[publisher] Publishing container...');
  const publishRes = await fetch(`${base}/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: token,
    }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok || publishData.error) {
    throw new Error(`IG publish error: ${JSON.stringify(publishData.error ?? publishData)}`);
  }

  return { post_id: publishData.id, stub: false };
}

/**
 * Publish a post markdown file. `imageUrl` is required by the IG Graph API
 * (and ignored in stub mode). Returns { post_id, postFile }.
 */
export async function publishPost({ postFile, imageUrl = 'https://example.com/placeholder.jpg' }) {
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
  const result = await publishToInstagram({ caption: fullCaption, imageUrl });

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
