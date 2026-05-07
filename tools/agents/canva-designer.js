/**
 * Canva designer agent — extracts the headline/tagline from an optimized post
 * draft, autofills a Canva template, exports it, and returns the public PNG URL.
 *
 * Required env:
 *   CANVA_CLIENT_ID
 *   CANVA_CLIENT_SECRET
 *   CANVA_TEMPLATE_ID  — your Instagram brand template id
 *
 * One-time setup: node tools/canva-auth.js
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readRepoFile } from './llm.js';
import { fillTemplate, exportDesign } from './canva.js';

const DEFAULT_TEMPLATE_ID = process.env.CANVA_TEMPLATE_ID || '';

/**
 * Extract a short headline and tagline from the post markdown caption.
 * Uses the first sentence as the headline and the second as the tagline.
 */
function extractHeadlineAndTagline(md) {
  const captionMatch = md.match(/##\s*Caption\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  const caption = (captionMatch?.[1] || '').trim();

  // First non-empty line → headline (max 60 chars)
  const lines = caption.split('\n').map((l) => l.trim()).filter(Boolean);
  const headline = (lines[0] || 'Premium Content').slice(0, 60);

  // Second non-empty line → tagline (max 100 chars), skip if same as headline
  const tagline = lines.length > 1 ? lines[1].slice(0, 100) : '';

  return { headline, tagline };
}

/**
 * Design an Instagram image for the given post file using Canva.
 *
 * @param {string} postFile       — relative path e.g. "instagram/posts/2026-05-06.md"
 * @param {string} [templateId]  — Canva template id (falls back to CANVA_TEMPLATE_ID env)
 * @returns {Promise<string>}     — Public PNG URL
 */
export async function designPost(postFile, templateId = DEFAULT_TEMPLATE_ID) {
  if (!templateId) {
    throw new Error(
      'No Canva template id provided.\n' +
      'Set the CANVA_TEMPLATE_ID env var or pass templateId explicitly.\n' +
      'Find your template id in the Canva template URL:\n' +
      '  https://www.canva.com/design/<TEMPLATE_ID>/edit'
    );
  }

  const md = await readRepoFile(postFile);
  if (!md) throw new Error(`Post file not found: ${postFile}`);

  const { headline, tagline } = extractHeadlineAndTagline(md);
  console.log(`[canva-designer] headline: "${headline}"`);
  if (tagline) console.log(`[canva-designer] tagline:  "${tagline}"`);

  console.log(`[canva-designer] filling template ${templateId}...`);
  const designId = await fillTemplate(templateId, { headline, ...(tagline ? { tagline } : {}) });
  console.log(`[canva-designer] design created: ${designId}`);

  console.log(`[canva-designer] exporting as PNG...`);
  const imageUrl = await exportDesign(designId);
  console.log(`[canva-designer] image URL: ${imageUrl}`);

  return imageUrl;
}

// CLI entry point
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const postFile   = process.argv[2];
  const templateId = process.argv[3] || DEFAULT_TEMPLATE_ID;
  if (!postFile) {
    console.error('Usage: node canva-designer.js <postFile> [templateId]');
    console.error('Example: node tools/agents/canva-designer.js instagram/posts/2026-05-06.md');
    process.exit(1);
  }
  designPost(postFile, templateId)
    .then((url) => console.log('\nImage URL:', url))
    .catch((e)  => { console.error(e.message); process.exit(1); });
}
