#!/usr/bin/env node
/**
 * One-time Canva OAuth 2.0 setup.
 *
 * Run once:  node tools/canva-auth.js
 *
 * Required env vars (set before running):
 *   CANVA_CLIENT_ID     — from https://www.canva.com/developers/
 *   CANVA_CLIENT_SECRET — from https://www.canva.com/developers/
 *
 * Flow:
 *   1. Opens the Canva authorization URL in your browser.
 *   2. Canva redirects to GitHub Pages (docs/callback.html) which displays the code.
 *   3. You paste the code here. Tokens are saved to tools/.canva-tokens.json (gitignored).
 *
 * Redirect URI to register in Canva developer portal: the value of
 * OAUTH_REDIRECT_URI in .env, or by default
 *   https://jodie555.github.io/instagram-agent/callback.html
 * If you host docs/callback.html on your own GitHub Pages, set
 * OAUTH_REDIRECT_URI=https://<you>.github.io/instagram-agent/callback.html
 */

import './agents/llm.js'; // loads .env
import readline from 'node:readline';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.join(__dirname, '.canva-tokens.json');

const CLIENT_ID     = process.env.CANVA_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
const REDIRECT_URI  = process.env.OAUTH_REDIRECT_URI || 'https://jodie555.github.io/instagram-agent/callback.html';
const SCOPES        = [
  'design:content:read',
  'design:content:write',
  'asset:read',
  'asset:write',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: CANVA_CLIENT_ID and CANVA_CLIENT_SECRET must be set.');
  console.error('');
  console.error('  $env:CANVA_CLIENT_ID     = "YOUR_CLIENT_ID"');
  console.error('  $env:CANVA_CLIENT_SECRET = "YOUR_CLIENT_SECRET"');
  console.error('  node tools/canva-auth.js');
  process.exit(1);
}

// PKCE helpers
function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
const codeVerifier  = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
const state         = base64url(crypto.randomBytes(16));

const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

console.log('\n===== Canva OAuth Setup =====');
console.log('\nStep 1: Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\nStep 2: Authorize in Canva.');
console.log('        You\'ll be redirected to GitHub Pages which shows a code.');
console.log('\nStep 3: Copy the code from the page and paste it below.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const code = await new Promise((resolve) => {
  rl.question('Paste the authorization code: ', (answer) => {
    rl.close();
    resolve(answer.trim());
  });
});

if (!code) {
  console.error('No code entered. Aborting.');
  process.exit(1);
}

// Exchange code for tokens
const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
const tokenResp = await fetch('https://api.canva.com/rest/v1/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type':  'application/x-www-form-urlencoded',
    'Authorization': `Basic ${credentials}`,
  },
  body: new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  REDIRECT_URI,
    code_verifier: codeVerifier,
  }).toString(),
});

if (!tokenResp.ok) {
  console.error(`Token exchange failed (${tokenResp.status}): ${await tokenResp.text()}`);
  process.exit(1);
}

const tokens = await tokenResp.json();
tokens.obtained_at = Date.now();

await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
console.log(`\nTokens saved to: ${TOKENS_FILE}`);
console.log('Setup complete. You can now run the pipeline.');
