/**
 * Photo Picker agent — uses GPT-4o vision (via GitHub Models) to select
 * the photo from a Google Photos album most likely to get the most likes.
 *
 * Sends low-res thumbnails (=w300) to minimise token usage, then returns
 * the full-resolution URL (=w1080) of the winning photo.
 * Tracks the chosen photo in instagram/used-images.json so it won't be
 * re-selected on the next run.
 */

import { callClaude, readRepoFile } from './llm.js';
import { getAlbumImageUrls, loadUsedImages, saveUsedImages } from './google-photos-album.js';

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
    const base = pool[0].split('=')[0];
    used.add(base);
    await saveUsedImages(used);
    console.log('[photo-picker] Only 1 candidate — using it directly.');
    return pool[0];
  }

  // Use low-res thumbnails for vision to minimise token cost
  const thumbUrls = pool.map((u) => `${u.split('=')[0]}=w300`);

  const lessons = await readRepoFile('instagram/lessons.md');

  const system =
    'You are an Instagram engagement expert. ' +
    'You will be shown several photos and must choose the one most likely to get the most likes on Instagram. ' +
    'Consider composition, lighting, colour, subject clarity, and emotional impact. ' +
    'Use the past lessons provided to inform your choice. ' +
    'Respond in exactly this format (two lines, nothing else):\n' +
    'PICK: <1-based index>\n' +
    'REASON: <one sentence explaining why>';

  const user = [
    `There are ${pool.length} photos (shown in order, numbered 1 to ${pool.length}).`,
    'Which one will get the most likes on Instagram?',
    '',
    '--- Past lessons from our Instagram account ---',
    lessons || '(no lessons yet)',
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
  const chosenBase = chosen.split('=')[0];

  used.add(chosenBase);
  await saveUsedImages(used);

  console.log(`[photo-picker] Selected photo ${index + 1} of ${pool.length}.`);
  return chosen;
}
