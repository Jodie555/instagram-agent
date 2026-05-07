/**
 * Optimizer agent — runs the 3-round create→critique→revise loop and
 * saves the best draft to `instagram/posts/YYYY-MM-DD.md`.
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { callClaude, loadChatModePrompt, readRepoFile, writeRepoFile, REPO_ROOT } from './llm.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function uniquePostPath(date) {
  let rel = `instagram/posts/${date}.md`;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await fs.access(path.join(REPO_ROOT, rel));
      rel = `instagram/posts/${date}-v${i}.md`;
      i += 1;
    } catch {
      return rel;
    }
  }
}

/**
 * Extract the final post block from the model output.
 * Looks for the last fenced markdown block, otherwise returns the whole text.
 */
function extractFinalDraft(text) {
  const matches = [...text.matchAll(/```(?:markdown)?\n([\s\S]*?)```/g)];
  if (matches.length === 0) return text.trim();
  return matches[matches.length - 1][1].trim();
}

export async function runOptimizer(topic, { save = true } = {}) {
  const system = await loadChatModePrompt('ig-optimizer');
  const lessons = await readRepoFile('instagram/lessons.md');

  const userMsg = [
    `Write an Instagram post about: ${topic}`,
    '',
    'Run all 3 rounds automatically without asking me anything.',
    'At the end, output ONLY the final winning post inside a single fenced ```markdown block.',
    '',
    '--- Current lessons.md ---',
    lessons || '(empty)',
  ].join('\n');

  console.log(`[optimizer] running 3-round loop for topic: ${topic}`);
  const fullText = await callClaude({ system, user: userMsg, maxTokens: 8000 });

  const finalDraft = extractFinalDraft(fullText);

  let savedPath = null;
  if (save) {
    const date = todayISO();
    const rel = await uniquePostPath(date);
    await writeRepoFile(rel, finalDraft);
    savedPath = rel;
    console.log(`[optimizer] saved: ${rel}`);
  }

  return { fullText, finalDraft, savedPath };
}

// CLI entry point
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const topic = process.argv.slice(2).join(' ');
  if (!topic) {
    console.error('Usage: node optimizer.js "<topic>"');
    process.exit(1);
  }
  runOptimizer(topic)
    .then((r) => console.log('\n=== FINAL DRAFT ===\n' + r.finalDraft))
    .catch((e) => { console.error(e); process.exit(1); });
}
