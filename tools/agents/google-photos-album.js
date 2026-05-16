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
 *   getAlbumImageUrls(shareUrl, n)  — first n image URLs from a shared album
 *   getLatestAlbumImageUrl(shareUrl) — the first (most recent) image URL
 */

// Match full lh3 URLs — stop at any quote, whitespace, backslash or JSON terminator
const LH3_REGEX = /https:\/\/lh3\.googleusercontent\.com\/[^\s"'\\,)>]*/g;

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

  const resp = await fetch(pageUrl, {
    headers: {
      // Mimic a real browser so the page returns full data
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

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
 * Returns the URL of the first (most recently added) photo in the shared album.
 *
 * @param {string} shareUrl
 * @returns {Promise<string>}
 */
export async function getLatestAlbumImageUrl(shareUrl) {
  const urls = await getAlbumImageUrls(shareUrl, 1);
  return urls[0];
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
