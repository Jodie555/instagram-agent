/**
 * Canva Connect API client.
 *
 * Handles token loading, auto-refresh, and the two operations used by the pipeline:
 *   - fillTemplate(templateId, fields)  → designId
 *   - exportDesign(designId)            → public PNG URL
 *
 * Tokens are read from tools/.canva-tokens.json (written by canva-auth.js).
 * Client credentials must be in env:
 *   CANVA_CLIENT_ID
 *   CANVA_CLIENT_SECRET
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.join(__dirname, '..', '.canva-tokens.json');
const API_BASE    = 'https://api.canva.com/rest/v1';
const REDIRECT_URI = 'https://jodie555.github.io/instagram-agent/callback.html';

// Refresh 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

let _tokens = null;

async function loadTokens() {
  if (_tokens) return _tokens;
  try {
    const raw = await fs.readFile(TOKENS_FILE, 'utf8');
    _tokens = JSON.parse(raw);
    return _tokens;
  } catch {
    throw new Error(
      `Canva tokens not found. Run first:\n  node tools/canva-auth.js`
    );
  }
}

async function saveTokens(t) {
  _tokens = t;
  await fs.writeFile(TOKENS_FILE, JSON.stringify(t, null, 2), 'utf8');
}

async function refreshIfNeeded() {
  const t = await loadTokens();
  const expiresAt = (t.obtained_at || 0) + (t.expires_in || 3600) * 1000;
  if (Date.now() < expiresAt - REFRESH_BUFFER_MS) return t;

  const clientId     = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('CANVA_CLIENT_ID and CANVA_CLIENT_SECRET env vars required for token refresh.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const resp = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: t.refresh_token,
      redirect_uri:  REDIRECT_URI,
    }).toString(),
  });

  if (!resp.ok) {
    throw new Error(`Canva token refresh failed: ${await resp.text()}`);
  }

  const fresh = await resp.json();
  fresh.obtained_at = Date.now();
  await saveTokens(fresh);
  return fresh;
}

async function canvaFetch(method, path_, body) {
  const t   = await refreshIfNeeded();
  const url = `${API_BASE}${path_}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${t.access_token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);
  if (!resp.ok) {
    throw new Error(`Canva API ${method} ${path_} failed (${resp.status}): ${await resp.text()}`);
  }
  return resp.json();
}

/**
 * Autofill a Canva template with the given fields and return the new design id.
 *
 * @param {string} templateId  — The Canva template ID (from template URL)
 * @param {Object} fields      — Key/value map of autofill field names → text values
 *                               e.g. { headline: "BMW Heritage", tagline: "50 years..." }
 * @returns {Promise<string>}  — New design id
 */
export async function fillTemplate(templateId, fields) {
  const data = Object.entries(fields).map(([name, value]) => ({
    name,
    type: 'text',
    text: value,
  }));

  const resp = await canvaFetch('POST', '/autofills', {
    brand_template_id: templateId,
    data,
  });

  // Autofill is async — poll until complete
  const jobId = resp.job?.id;
  if (!jobId) throw new Error(`Unexpected Canva autofill response: ${JSON.stringify(resp)}`);

  return pollAutofillJob(jobId);
}

async function pollAutofillJob(jobId, maxWaitMs = 60_000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const resp = await canvaFetch('GET', `/autofills/${jobId}`);
    const status = resp.job?.status;
    if (status === 'success') return resp.job.result?.design?.id;
    if (status === 'failed')  throw new Error(`Canva autofill job failed: ${JSON.stringify(resp)}`);
  }
  throw new Error(`Canva autofill timed out after ${maxWaitMs / 1000}s`);
}

/**
 * Export a Canva design as PNG and return the public download URL.
 *
 * @param {string} designId
 * @returns {Promise<string>}  — Public PNG URL valid for ~30 minutes
 */
export async function exportDesign(designId) {
  const resp = await canvaFetch('POST', '/exports', {
    design_id: designId,
    format:    'png',
    export_quality: 'pro',
  });

  const jobId = resp.job?.id;
  if (!jobId) throw new Error(`Unexpected Canva export response: ${JSON.stringify(resp)}`);

  return pollExportJob(jobId);
}

async function pollExportJob(jobId, maxWaitMs = 60_000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const resp = await canvaFetch('GET', `/exports/${jobId}`);
    const status = resp.job?.status;
    if (status === 'success') return resp.job.urls?.[0];
    if (status === 'failed')  throw new Error(`Canva export job failed: ${JSON.stringify(resp)}`);
  }
  throw new Error(`Canva export timed out after ${maxWaitMs / 1000}s`);
}
