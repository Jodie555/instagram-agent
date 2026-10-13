/**
 * fetch() with retries for transient failures.
 *
 * Retries on network errors (DNS, reset, timeout), HTTP 429 and HTTP 5xx,
 * waiting 2s, 4s, 8s ... between attempts (or the server's Retry-After).
 * Any other response (2xx, 4xx) is returned as-is for the caller to handle.
 *
 * Only use this for requests that are safe to send twice. Instagram's
 * media_publish is NOT — see publisher.js for how that one is handled.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url, opts = {}, { retries = 3, baseDelayMs = 2000, timeoutMs = 30_000, label = 'request' } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res;
    let error;
    try {
      res = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      error = e;
    }

    const transient = error || res.status === 429 || res.status >= 500;
    if (!transient || attempt >= retries) {
      if (error) throw new Error(`${label} failed after ${attempt + 1} attempt(s): ${error.message}`);
      return res;
    }

    const retryAfter = Number(res?.headers.get('retry-after'));
    const delay = retryAfter > 0 ? retryAfter * 1000 : baseDelayMs * 2 ** attempt;
    const reason = error ? error.message : `HTTP ${res.status}`;
    console.error(`[net] ${label}: ${reason} — retry ${attempt + 1}/${retries} in ${Math.round(delay / 1000)}s`);
    await sleep(delay);
  }
}
