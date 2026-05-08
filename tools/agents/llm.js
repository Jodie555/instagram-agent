/**
 * Shared LLM client + helper to call the model with a chat-mode system prompt.
 *
 * Backend selection (in priority order):
 *   1. GITHUB_TOKEN set  → GitHub Models API (free for Copilot subscribers)
 *   2. OPENAI_API_KEY set → OpenAI API
 *   3. ANTHROPIC_API_KEY set → Anthropic API
 *
 * Reads the chat mode markdown from `.github/chatmodes/<name>.chatmode.md`
 * and uses everything below the YAML frontmatter as the system prompt.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ── Backend detection ────────────────────────────────────────────────────────

const BACKEND = process.env.GITHUB_TOKEN
  ? 'github'
  : process.env.OPENAI_API_KEY
  ? 'openai'
  : process.env.ANTHROPIC_API_KEY
  ? 'anthropic'
  : null;

if (!BACKEND) {
  console.warn(
    '[llm] No API key found. Set GITHUB_TOKEN, OPENAI_API_KEY, or ANTHROPIC_API_KEY.'
  );
}

console.log(`[llm] Using backend: ${BACKEND ?? 'none'}`);

// ── Model defaults ───────────────────────────────────────────────────────────

const DEFAULT_MODEL =
  process.env.LLM_MODEL ||
  (BACKEND === 'github'
    ? 'gpt-4o'                        // or 'claude-sonnet-4-5-20250929' if preferred
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
export async function callClaude({ system, user, maxTokens = 8000, model = DEFAULT_MODEL }) {
  if (BACKEND === 'github' || BACKEND === 'openai') {
    return callOpenAICompat({ system, user, maxTokens, model });
  }
  if (BACKEND === 'anthropic') {
    return callAnthropic({ system, user, maxTokens, model });
  }
  throw new Error(
    'No LLM backend configured. Set GITHUB_TOKEN, OPENAI_API_KEY, or ANTHROPIC_API_KEY.'
  );
}

// ── GitHub Models / OpenAI backend ───────────────────────────────────────────

async function callOpenAICompat({ system, user, maxTokens, model }) {
  const { default: OpenAI } = await import('openai');

  const baseURL =
    BACKEND === 'github'
      ? 'https://models.inference.ai.azure.com'
      : 'https://api.openai.com/v1';

  const apiKey =
    BACKEND === 'github' ? process.env.GITHUB_TOKEN : process.env.OPENAI_API_KEY;

  const client = new OpenAI({ baseURL, apiKey });

  const resp = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  return resp.choices[0]?.message?.content ?? '';
}

// ── Anthropic backend ─────────────────────────────────────────────────────────

async function callAnthropic({ system, user, maxTokens, model }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const resp = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
