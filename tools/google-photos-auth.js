#!/usr/bin/env node
/**
 * One-time Google Photos OAuth 2.0 setup.
 *
 * Run once:  node tools/google-photos-auth.js
 *
 * Required env vars (set before running):
 *   GOOGLE_CLIENT_ID     — from https://console.cloud.google.com/
 *   GOOGLE_CLIENT_SECRET — from https://console.cloud.google.com/
 *
 * Setup steps in Google Cloud Console:
 *   1. Create a project at https://console.cloud.google.com/
 *   2. Enable "Photos Library API"
 *   3. Create OAuth 2.0 credentials (Web Application type)
 *   4. Add authorized redirect URI: the value of OAUTH_REDIRECT_URI in .env,
 *      or by default https://jodie555.github.io/instagram-agent/callback.html
 *   5. Copy Client ID and Client Secret into env vars below
 *
 * Tokens are saved to tools/.google-tokens.json (gitignored).
 */

import './agents/llm.js'; // loads .env
import readline from 'node:readline';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.join(__dirname, '.google-tokens.json');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.OAUTH_REDIRECT_URI || 'https://jodie555.github.io/instagram-agent/callback.html';
const SCOPES        = 'https://www.googleapis.com/auth/photoslibrary.readonly';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.');
  console.error('');
  console.error('  $env:GOOGLE_CLIENT_ID     = "YOUR_CLIENT_ID"');
  console.error('  $env:GOOGLE_CLIENT_SECRET = "YOUR_CLIENT_SECRET"');
  console.error('  node tools/google-photos-auth.js');
  process.exit(1);
}

// PKCE helpers
function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
const codeVerifier  = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
const state         = base64url(crypto.randomBytes(16));

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('access_type', 'offline');  // request refresh token
authUrl.searchParams.set('prompt', 'consent');        // force refresh token every time

console.log('\n===== Google Photos OAuth Setup =====');
console.log('\nStep 1: Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\nStep 2: Sign in and allow access to Google Photos.');
console.log("        You'll be redirected to GitHub Pages which shows a code.");
console.log('\nStep 3: Copy the code from the page and paste it below.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const code = await new Promise((resolve) => {
  rl.question('Paste the authorization code: ', (answer) => {
    rl.close();
    resolve(answer.trim());
  });
});

if (!code) {
  console.error('No code provided. Exiting.');
  process.exit(1);
}

// Exchange code for tokens
const body = new URLSearchParams({
  grant_type:    'authorization_code',
  client_id:     CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uri:  REDIRECT_URI,
  code,
  code_verifier: codeVerifier,
});

const resp = await fetch('https://oauth2.googleapis.com/token', {
  method:  'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body:    body.toString(),
});

if (!resp.ok) {
  const err = await resp.text();
  console.error('Token exchange failed:', err);
  process.exit(1);
}

const tokens = await resp.json();
tokens.client_id     = CLIENT_ID;
tokens.client_secret = CLIENT_SECRET;
tokens.obtained_at   = Date.now();

await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
console.log(`\nTokens saved to tools/.google-tokens.json`);
console.log('You can now use --google-photo in the pipeline.\n');
