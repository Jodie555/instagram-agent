/**
 * Shared Anthropic client + helper to call Claude with a chat-mode system prompt.
 *
 * Reads the chat mode markdown from `.github/chatmodes/<name>.chatmode.md`
 * and uses everything below the YAML frontmatter as the system prompt.
 */

import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[llm] ANTHROPIC_API_KEY not set — agent calls will fail.');
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

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

/**
 * Call Claude with a system prompt + user message. Returns the text response.
 */
export async function callClaude({ system, user, maxTokens = 8000, model = DEFAULT_MODEL }) {
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
