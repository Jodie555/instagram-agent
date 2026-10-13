/**
 * Photo Picker agent — uses LLM vision (see llm.js for the backend) to select
 * the photo from a Google Photos album most likely to get the most likes.
 *
 * Sends low-res thumbnails (=w300) to minimise token usage, then returns
 * the full-resolution URL (=w1080) of the winning photo.
 * Skips photos listed in instagram/used-images.json. The publisher adds the
 * chosen photo to that list once the post is actually published.
 */

import { callClaude, readAccountMemory } from './llm.js';
import { getAlbumImageUrls, loadUsedImages } from './google-photos-album.js';

/**
 * Pick the best photo from a shared Google Photos album using LLM vision.
 *
 * @param {string} shareUrl       - photos.app.goo.gl or photos.google.com/share URL
 * @param {object} [opts]
 * @param {number} [opts.maxPhotos=10] - max candidates to send to the LLM
 * @returns {Promise<string>}     - full-resolution image URL of the chosen photo
 */
export async function pickBestPhoto(shareUrl, { maxPhotos = 10 } = {}) {
  const allUrls = await getAlbumImageUrls(shareUrl, Infinity);
  const used = await loadUsedImages();

  // Filter to unused photos; if all used, start fresh
  const unused = allUrls.filter((u) => !used.has(u.split('=')[0]));
  const pool = (unused.length > 0 ? unused : allUrls).slice(0, maxPhotos);

  if (pool.length === 0) throw new Error('[photo-picker] No photos found in album.');

  if (pool.length === 1) {
    console.log('[photo-picker] Only 1 candidate — using it directly.');
    return pool[0];
  }

  // Use low-res thumbnails for vision to minimise token cost
  const thumbUrls = pool.map((u) => `${u.split('=')[0]}=w300`);

  const { brandVoice, learnings } = await readAccountMemory();

  const system =
    'You are an Instagram engagement expert. ' +
    'You will be shown several photos and must choose the one most likely to get the most likes on Instagram. ' +
    'Consider composition, lighting, colour, subject clarity, and emotional impact. ' +
    'Prefer photos that follow the visual rules in the brand voice, and use the learnings to inform your choice. ' +
    'Respond in exactly this format (two lines, nothing else):\n' +
    'PICK: <1-based index>\n' +
    'REASON: <one sentence explaining why>';

  const user = [
    `There are ${pool.length} photos (shown in order, numbered 1 to ${pool.length}).`,
    'Which one will get the most likes on Instagram?',
    '',
    '--- Brand voice (visual rules) ---',
    brandVoice || '(none)',
    '',
    '--- Learnings (hypotheses about what works) ---',
    learnings || '(none yet)',
    '',
    'Reply in the required format.',
  ].join('\n');

  console.log(`[photo-picker] Asking LLM to pick best photo from ${pool.length} candidates...`);
  const response = await callClaude({ system, user, images: thumbUrls, maxTokens: 100 });

  const pickMatch = response.match(/PICK:\s*(\d+)/);
  const reasonMatch = response.match(/REASON:\s*(.+)/);
  const raw = pickMatch ? parseInt(pickMatch[1], 10) : NaN;
  const index = Number.isFinite(raw) ? Math.max(1, Math.min(raw, pool.length)) - 1 : 0;
  const reason = reasonMatch ? reasonMatch[1].trim() : '(no reason given)';

  console.log(`[photo-picker] Reason: ${reason}`);

  const chosen = pool[index];

  // Not marked as used here — the publisher marks it after a successful
  // publish, so a failed run doesn't burn the photo.
  console.log(`[photo-picker] Selected photo ${index + 1} of ${pool.length}.`);
  return chosen;
}
