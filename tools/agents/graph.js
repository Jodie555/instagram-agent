/**
 * Shared Instagram Graph API helpers.
 *
 * The API version lives here (and only here) so it can be bumped in one place.
 * Override with IG_GRAPH_VERSION in .env, e.g. IG_GRAPH_VERSION=v25.0
 */

import './llm.js'; // loads .env

export const GRAPH_VERSION = process.env.IG_GRAPH_VERSION || 'v24.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function graphRequest(method, endpoint, params) {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) throw new Error('IG_ACCESS_TOKEN is not set');
  const url = new URL(`${GRAPH_BASE}${endpoint}`);
  Object.entries({ ...params, access_token: token }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );
  const res = await fetch(url.toString(), { method });
  const json = await res.json();
  if (json.error) {
    const err = new Error(`Graph API error: ${json.error.message} (code ${json.error.code})`);
    err.payload = json.error;
    throw err;
  }
  return json;
}

/** GET a Graph API endpoint. Throws on any API error (expired token, bad id, ...). */
export const graphGet = (endpoint, params = {}) => graphRequest('GET', endpoint, params);

/** POST to a Graph API endpoint. Throws on any API error. */
export const graphPost = (endpoint, params = {}) => graphRequest('POST', endpoint, params);
