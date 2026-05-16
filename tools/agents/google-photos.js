/**
 * Google Photos agent — fetches publicly-accessible image URLs from your
 * Google Photos library.
 *
 * Google Photos API baseUrl is publicly accessible (no auth required) for
 * ~60 minutes — long enough for Instagram's servers to fetch the image.
 *
 * Required: run `node tools/google-photos-auth.js` once to create
 *           tools/.google-tokens.json
 *
 * Exported helpers:
 *   getLatestPhotoUrl()              — URL of the most recently added photo
 *   getAlbumPhotoUrls(albumId, n)    — URLs of the first n photos in an album
 *   listAlbums()                     — [{ id, title, itemCount }]
 *   searchPhotos(filters, n)         — search by date range or content categories
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.join(__dirname, '..', '.google-tokens.json');
const API_BASE    = 'https://photoslibrary.googleapis.com/v1';

// ─── Token management ────────────────────────────────────────────────────────

async function loadTokens() {
  try {
    const raw = await fs.readFile(TOKENS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    throw new Error(
      'Google tokens not found. Run `node tools/google-photos-auth.js` first.'
    );
  }
}

async function saveTokens(tokens) {
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

async function getAccessToken() {
  const tokens = await loadTokens();

  // Refresh if expires in less than 5 minutes
  const expiresAt = (tokens.obtained_at || 0) + (tokens.expires_in || 3600) * 1000;
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    throw new Error(
      'No refresh token found. Re-run `node tools/google-photos-auth.js`.'
    );
  }

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     tokens.client_id,
    client_secret: tokens.client_secret,
    refresh_token: tokens.refresh_token,
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }

  const fresh = await resp.json();
  const updated = {
    ...tokens,
    access_token: fresh.access_token,
    expires_in:   fresh.expires_in ?? 3600,
    obtained_at:  Date.now(),
    // keep existing refresh_token if a new one wasn't issued
    refresh_token: fresh.refresh_token ?? tokens.refresh_token,
  };
  await saveTokens(updated);
  return updated.access_token;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiGet(endpoint, params = {}) {
  const token = await getAccessToken();
  const url   = new URL(`${API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google Photos API error (${resp.status}): ${err}`);
  }
  return resp.json();
}

async function apiPost(endpoint, bodyObj) {
  const token = await getAccessToken();
  const resp  = await fetch(`${API_BASE}${endpoint}`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyObj),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google Photos API error (${resp.status}): ${err}`);
  }
  return resp.json();
}

/**
 * Google Photos baseUrl is publicly accessible but expires in ~60 minutes.
 * Append sizing parameters for a usable Instagram resolution:
 *   =w1080  — resize width to 1080 px (keeps aspect ratio)
 *   =d      — original full resolution download
 */
function toPublicUrl(baseUrl, width = 1080) {
  return `${baseUrl}=w${width}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the baseUrl of the most recently added photo in your library.
 */
export async function getLatestPhotoUrl() {
  const data = await apiGet('/mediaItems', { pageSize: 1 });
  const item = data.mediaItems?.[0];
  if (!item) throw new Error('No photos found in Google Photos library.');
  console.log(`[google-photos] Latest photo: ${item.filename}`);
  return toPublicUrl(item.baseUrl);
}

/**
 * Returns an array of public URLs for the first `n` photos in an album.
 * @param {string} albumId  — album ID from listAlbums()
 * @param {number} n        — max photos to return (default 1)
 */
export async function getAlbumPhotoUrls(albumId, n = 1) {
  const data = await apiPost('/mediaItems:search', {
    albumId,
    pageSize: Math.min(n, 100),
  });
  const items = data.mediaItems ?? [];
  if (!items.length) throw new Error(`No photos found in album ${albumId}.`);
  console.log(`[google-photos] Found ${items.length} photo(s) in album.`);
  return items.map((item) => toPublicUrl(item.baseUrl));
}

/**
 * Lists all albums in the library.
 * Returns [{ id, title, itemCount, coverUrl }]
 */
export async function listAlbums() {
  const data  = await apiGet('/albums', { pageSize: 50 });
  const albums = data.albums ?? [];
  return albums.map((a) => ({
    id:        a.id,
    title:     a.title,
    itemCount: Number(a.mediaItemsCount ?? 0),
    coverUrl:  a.coverPhotoBaseUrl ? toPublicUrl(a.coverPhotoBaseUrl, 400) : null,
  }));
}

/**
 * Search photos by content category or date range.
 *
 * @param {object} filters  — Google Photos Filters object, e.g.:
 *   { contentFilter: { includedContentCategories: ['LANDSCAPES'] } }
 *   { dateFilter: { ranges: [{ startDate: { year:2026, month:1, day:1 }, endDate: { year:2026, month:12, day:31 } }] } }
 * @param {number} n        — max results (default 1)
 */
export async function searchPhotos(filters, n = 1) {
  const data  = await apiPost('/mediaItems:search', { filters, pageSize: Math.min(n, 100) });
  const items = data.mediaItems ?? [];
  if (!items.length) throw new Error('No photos matched the search filters.');
  return items.map((item) => toPublicUrl(item.baseUrl));
}

// ─── CLI usage ───────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('google-photos.js')) {
  const cmd = process.argv[2] ?? 'latest';

  if (cmd === 'latest') {
    const url = await getLatestPhotoUrl();
    console.log('URL:', url);
  } else if (cmd === 'albums') {
    const albums = await listAlbums();
    console.table(albums.map(({ id, title, itemCount }) => ({ id, title, itemCount })));
  } else if (cmd === 'album') {
    const albumId = process.argv[3];
    if (!albumId) { console.error('Usage: google-photos.js album <albumId>'); process.exit(1); }
    const urls = await getAlbumPhotoUrls(albumId, 5);
    urls.forEach((u, i) => console.log(`[${i + 1}] ${u}`));
  } else {
    console.error(`Unknown command: ${cmd}. Use: latest | albums | album <id>`);
    process.exit(1);
  }
}
