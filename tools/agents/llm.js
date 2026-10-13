/**
 * Shared LLM client + helper to call the model with a chat-mode system prompt.
 *
 * Backend selection:
 *   LLM_BACKEND=claude-code → Claude Code CLI (`claude -p`), billed to the
 *                             logged-in Claude subscription. Default model
 *                             claude-haiku-5-5. Requires `claude` on PATH and
 *                             a prior `claude` login on this machine.
 *   Otherwise, in priority order (or force one with LLM_BACKEND=openai|anthropic):
 *   1. OPENAI_API_KEY set → OpenAI API
 *   2. ANTHROPIC_API_KEY set → Anthropic API
 *
 *   (GitHub Models was removed: GitHub retired it, including the inference
 *   API, on 2026-07-30.)
 *
 * Reads the chat mode markdown from `.github/chatmodes/<name>.chatmode.md`
 * and uses everything below the YAML frontmatter as the system prompt.
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Load .env from repo root (silently ignored if file doesn't exist)
// quiet: true prevents dotenv from printing its banner to stdout, which would
// corrupt the JSON-RPC channel when this module is used inside an MCP server.
dotenvConfig({ path: path.join(REPO_ROOT, '.env'), quiet: true });

// ── Backend detection ────────────────────────────────────────────────────────

const BACKEND = process.env.LLM_BACKEND
  ? process.env.LLM_BACKEND
  : process.env.OPENAI_API_KEY
  ? 'openai'
  : process.env.ANTHROPIC_API_KEY
  ? 'anthropic'
  : null;

if (!BACKEND) {
  console.warn(
    '[llm] No LLM backend configured. Set LLM_BACKEND=claude-code, OPENAI_API_KEY, or ANTHROPIC_API_KEY.'
  );
}

console.error(`[llm] Using backend: ${BACKEND ?? 'none'}`);

// ── Model defaults ───────────────────────────────────────────────────────────

const DEFAULT_MODEL =
  process.env.LLM_MODEL ||
  (BACKEND === 'claude-code'
    ? 'claude-haiku-5-5'
    : BACKEND === 'openai'
    ? 'gpt-4o'
    : 'claude-sonnet-4-5-20250929');  // anthropic default

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip YAML frontmatter from a chat-mode markdown file. */
function stripFrontmatter(md) {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  if (end === -1) return md;
  return md.slice(end + 4).trimStart();
}

/** Load a chat-mode prompt by name (e.g. "ig-optimizer"). */
export async function loadChatModePrompt(name) {
  const file = path.join(REPO_ROOT, '.github', 'chatmodes', `${name}.chatmode.md`);
  const md = await fs.readFile(file, 'utf8');
  return stripFrontmatter(md);
}

/** Read repo file relative to REPO_ROOT (returns '' if missing). */
export async function readRepoFile(relPath) {
  try {
    return await fs.readFile(path.join(REPO_ROOT, relPath), 'utf8');
  } catch {
    return '';
  }
}

/**
 * Load the account memory the agents should follow: brand voice (hard rules),
 * curated hypotheses, and the reviewer's raw lessons. Missing files → ''.
 */
export async function readAccountMemory() {
  const [brandVoice, learnings, lessons] = await Promise.all([
    readRepoFile('instagram-memory/brand-voice.md'),
    readRepoFile('instagram-memory/learnings.md'),
    readRepoFile('instagram/lessons.md'),
  ]);
  return { brandVoice, learnings, lessons };
}

/** Write repo file relative to REPO_ROOT (creates parents). */
export async function writeRepoFile(relPath, content) {
  const full = path.join(REPO_ROOT, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
  return full;
}

// ── Core LLM call ────────────────────────────────────────────────────────────

/**
 * Call the configured LLM with a system prompt + user message.
 * Returns the text response string.
 */
export async function callClaude({ system, user, images = [], maxTokens = 8000, model = DEFAULT_MODEL }) {
  if (BACKEND === 'claude-code') {
    return callClaudeCode({ system, user, images, model });
  }
  if (BACKEND === 'openai') {
    return callOpenAICompat({ system, user, images, maxTokens, model });
  }
  if (BACKEND === 'github') {
    throw new Error('GitHub Models was retired on 2026-07-30. Set LLM_BACKEND=claude-code (or openai/anthropic) in .env.');
  }
  if (BACKEND === 'anthropic') {
    return callAnthropic({ system, user, images, maxTokens, model });
  }
  throw new Error(
    BACKEND
      ? `Unknown LLM_BACKEND "${BACKEND}". Use claude-code, openai, or anthropic.`
      : 'No LLM backend configured. Set LLM_BACKEND=claude-code, OPENAI_API_KEY, or ANTHROPIC_API_KEY.'
  );
}

// ── Claude Code CLI backend (Claude subscription) ────────────────────────────

/** Download an image URL and turn it into an Anthropic base64 image block. */
async function imageBlockFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status}): ${url}`);
  const mediaType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const data = Buffer.from(await res.arrayBuffer()).toString('base64');
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
}

/**
 * Run one prompt through `claude -p` as a plain completion: no tools, no MCP
 * servers, no saved session. The prompt (and any images) go in on stdin as a
 * stream-json user message; the system prompt goes in via a temp file so no
 * long text has to pass through the Windows shell.
 */
async function callClaudeCode({ system, user, images, model }) {
  const content = [
    ...(await Promise.all(images.map(imageBlockFromUrl))),
    { type: 'text', text: user },
  ];
  const input = JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n';

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-llm-'));
  const systemFile = path.join(tmpDir, 'system.txt');
  await fs.writeFile(systemFile, system, 'utf8');

  const args = [
    '-p',
    '--model', model,
    '--system-prompt-file', `"${systemFile}"`,
    '--tools', '""',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--disable-slash-commands',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--verbose',
  ];

  try {
    const stdout = await new Promise((resolve, reject) => {
      // shell: true so Windows can run the npm `claude.cmd` shim. Every arg
      // above is a fixed token or a quoted temp path, so nothing user-supplied
      // reaches the shell.
      const child = spawn(process.env.CLAUDE_CLI || 'claude', args, {
        cwd: tmpDir,          // keep the repo's CLAUDE.md / settings out of the call
        shell: true,
        windowsHide: true,
        env: process.env,
      });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('[llm] claude CLI timed out after 5 minutes'));
      }, 5 * 60 * 1000);
      child.stdout.on('data', (d) => { out += d; });
      child.stderr.on('data', (d) => { err += d; });
      child.on('error', (e) => { clearTimeout(timer); reject(new Error(`[llm] could not start claude CLI: ${e.message}`)); });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0 && !out.includes('"type":"result"')) {
          reject(new Error(`[llm] claude CLI exited with code ${code}: ${err.trim().slice(0, 500)}`));
        } else {
          resolve(out);
        }
      });
      child.stdin.end(input);
    });

    const result = stdout
      .split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .find((m) => m?.type === 'result');
    if (!result) throw new Error('[llm] claude CLI returned no result');
    if (result.is_error || result.subtype !== 'success') {
      throw new Error(`[llm] claude CLI error (${result.subtype}): ${String(result.result ?? '').slice(0, 500)}`);
    }
    return result.result ?? '';
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

// ── OpenAI backend ───────────────────────────────────────────────────────────

async function callOpenAICompat({ system, user, images, maxTokens, model }) {
  const { default: OpenAI } = await import('openai');

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userContent = images.length
    ? [
        ...images.map((url) => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
        { type: 'text', text: user },
      ]
    : user;

  const resp = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  });

  return resp.choices[0]?.message?.content ?? '';
}

// ── Anthropic backend ─────────────────────────────────────────────────────────

async function callAnthropic({ system, user, images, maxTokens, model }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userContent = images.length
    ? [
        ...images.map((url) => ({ type: 'image', source: { type: 'url', url } })),
        { type: 'text', text: user },
      ]
    : user;

  const resp = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
  return resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
