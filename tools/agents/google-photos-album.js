/**
 * Google Photos shared album scraper.
 *
 * Works with public "share link" albums (photos.app.goo.gl or photos.google.com/share/...).
 * No API keys or OAuth required.
 *
 * Google Photos shared album pages embed all photo base-URLs in their HTML as
 * lh3.googleusercontent.com URLs. We extract those and append sizing parameters
 * so Instagram can fetch them at a usable resolution.
 *
 * Exported helpers:
 *   getAlbumImageUrls(shareUrl, n)       — first n image URLs from a shared album
 *   getLatestAlbumImageUrl(shareUrl)     — next UNUSED image from the album (round-robins through all photos)
 */

import path from 'node:path';
import { fetchWithRetry } from './net.js';
import { promises as fs } from 'node:fs';
import { REPO_ROOT } from './llm.js';

// Match full lh3 URLs — stop at any quote, whitespace, backslash or JSON terminator
const LH3_REGEX = /https:\/\/lh3\.googleusercontent\.com\/[^\s"'\\,)>]*/g;

const USED_IMAGES_FILE = path.join(REPO_ROOT, 'instagram', 'used-images.json');

export async function loadUsedImages() {
  try {
    const data = await fs.readFile(USED_IMAGES_FILE, 'utf8');
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

export async function saveUsedImages(set) {
  await fs.writeFile(USED_IMAGES_FILE, JSON.stringify([...set], null, 2));
}

/**
 * Record a Google Photos image as used. Call this only after the post has
 * actually been published, so failed runs don't burn photos.
 * Non-Google URLs are ignored.
 */
export async function markImageUsed(url) {
  if (!url || !url.includes('googleusercontent.com')) return;
  const used = await loadUsedImages();
  used.add(url.split('=')[0]);
  await saveUsedImages(used);
}

/**
 * Append Google's image-serving size parameter.
 * =w1080  → resize to 1080 px wide (keeps aspect ratio, good for Instagram)
 */
function sized(baseUrl, width = 1080) {
  return `${baseUrl}=w${width}`;
}

/**
 * Resolve a short photos.app.goo.gl URL to its full photos.google.com URL.
 */
async function resolveRedirect(url) {
  const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  return resp.url;
}

/**
 * Fetch the shared album page HTML and extract unique lh3 image base-URLs.
 *
 * @param {string} shareUrl  — photos.app.goo.gl/... or photos.google.com/share/...
 * @param {number} n         — max number of URLs to return (default: all)
 * @returns {Promise<string[]>} array of sized image URLs
 */
export async function getAlbumImageUrls(shareUrl, n = Infinity) {
  // Follow short-link redirect if needed
  let pageUrl = shareUrl;
  if (shareUrl.includes('photos.app.goo.gl')) {
    pageUrl = await resolveRedirect(shareUrl);
  }

  const resp = await fetchWithRetry(pageUrl, {
    headers: {
      // Mimic a real browser so the page returns full data
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  }, { label: 'Google Photos album page' });

  if (!resp.ok) {
    throw new Error(`Failed to fetch shared album page (${resp.status}): ${pageUrl}`);
  }

  const html = await resp.text();

  // Extract all lh3.googleusercontent.com URLs, keep only actual photo paths (pw/)
  const raw = html.match(LH3_REGEX) ?? [];

  // Strip any existing size params (everything from = onwards) then de-duplicate
  const seen    = new Set();
  const matches = [];
  for (const u of raw) {
    if (!u.includes('/pw/')) continue;          // skip avatars, thumbnails, icons
    const base = u.split('=')[0];               // strip existing size params
    if (seen.has(base)) continue;
    seen.add(base);
    matches.push(base);
  }

  if (!matches.length) {
    throw new Error(
      'No images found in the shared album page. ' +
      'Make sure the album link is set to "Anyone with the link can view".'
    );
  }

  console.log(`[google-photos-album] Found ${matches.length} image(s) in album.`);

  const urls = matches.slice(0, n === Infinity ? matches.length : n);
  return urls.map((u) => sized(u));
}

/**
 * Returns the next unused photo from the shared album, based on
 * instagram/used-images.json. Does not mark it as used — the publisher does
 * that after a successful publish. Once all photos are used, starts over.
 *
 * @param {string} shareUrl
 * @returns {Promise<string>}
 */
export async function getLatestAlbumImageUrl(shareUrl) {
  const allUrls = await getAlbumImageUrls(shareUrl);
  const used = await loadUsedImages();

  // Strip size params to get base URLs for comparison
  const basesToSized = new Map(allUrls.map((u) => [u.split('=')[0], u]));
  const unused = [...basesToSized.entries()].filter(([base]) => !used.has(base));

  let chosen;
  if (unused.length > 0) {
    // Pick the first unused image
    chosen = unused[0];
  } else {
    // All photos used — start over
    console.log('[google-photos-album] All album images have been used. Starting over.');
    chosen = [...basesToSized.entries()][0];
  }

  const [, sizedUrl] = chosen;
  console.log(`[google-photos-album] Picked image (${basesToSized.size - unused.length}/${basesToSized.size} already used): ${sizedUrl}`);
  return sizedUrl;
}

// ─── CLI usage ────────────────────────────────────────────────────────────────
// node tools/agents/google-photos-album.js <shareUrl> [n]

if (process.argv[1] && process.argv[1].endsWith('google-photos-album.js')) {
  const shareUrl = process.argv[2];
  const n        = process.argv[3] ? Number(process.argv[3]) : 5;

  if (!shareUrl) {
    console.error('Usage: node tools/agents/google-photos-album.js <shareUrl> [n]');
    process.exit(1);
  }

  const urls = await getAlbumImageUrls(shareUrl, n);
  urls.forEach((u, i) => console.log(`[${i + 1}] ${u}`));
}
