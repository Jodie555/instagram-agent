/**
 * Publisher agent — publishes a post draft to Instagram.
 *
 * Currently a STUB (mirrors tools/ig-mcp-server.js). Replace `publishToInstagram`
 * with real Graph API calls when ready.
 *
 * Required env (when implementing for real):
 *   IG_ACCESS_TOKEN  — long-lived Instagram Graph API token
 *   IG_USER_ID       — Instagram Business/Creator account id
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
 * STUB — replace with real Instagram Graph API calls.
 *   1. POST /{ig-user-id}/media           (creates container with image_url + caption)
 *   2. POST /{ig-user-id}/media_publish   (publishes the container)
 */
async function publishToInstagram({ caption, imageUrl }) {
  if (!process.env.IG_ACCESS_TOKEN) {
    const post_id = `stub_${Date.now()}`;
    console.log(`[publisher] STUB mode (no IG_ACCESS_TOKEN). Generated id: ${post_id}`);
    return { post_id, stub: true };
  }
  // TODO: implement real Graph API calls here
  throw new Error('Real Instagram publishing not yet implemented. Set up Graph API calls.');
}

/**
 * Publish a post markdown file. `imageUrl` is required by the IG Graph API
 * (and ignored in stub mode). Returns { post_id, postFile }.
 */
export async function publishPost({ postFile, imageUrl = 'https://example.com/placeholder.jpg' }) {
  const md = await readRepoFile(postFile);
  if (!md) throw new Error(`Post file not found: ${postFile}`);

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
