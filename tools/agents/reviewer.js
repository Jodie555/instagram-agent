/**
 * Reviewer agent — reads metrics for a post and appends new lessons to
 * `instagram/lessons.md`.
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { callClaude, loadChatModePrompt, readRepoFile, writeRepoFile, REPO_ROOT } from './llm.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Find the latest post markdown that mentions a given post_id, or fall back
 * to the newest dated post file.
 */
async function findPostFileForId(postId) {
  const dir = path.join(REPO_ROOT, 'instagram', 'posts');
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
  } catch {
    return null;
  }
  for (const f of files) {
    const md = await fs.readFile(path.join(dir, f), 'utf8');
    if (md.includes(postId)) return `instagram/posts/${f}`;
  }
  files.sort();
  return files.length ? `instagram/posts/${files[files.length - 1]}` : null;
}

/**
 * Pull a "## YYYY-MM-DD review" section out of the model output.
 */
function extractLessonsSection(text, fallbackDate) {
  const m = text.match(/##\s*\d{4}-\d{2}-\d{2}\s+review[\s\S]*$/);
  if (m) return m[0].trim() + '\n';
  // Fall back: if model returned only bullets, wrap them.
  const bullets = text.match(/(^|\n)\s*-\s+.+/g);
  if (bullets) {
    return `## ${fallbackDate} review\n${bullets.join('\n').trim()}\n`;
  }
  return `## ${fallbackDate} review\n- ${text.trim().split('\n').join('\n- ')}\n`;
}

export async function runReviewer(postId, { append = true } = {}) {
  const metricsRel = `instagram/metrics/${postId}.json`;
  const metrics = await readRepoFile(metricsRel);
  if (!metrics) {
    throw new Error(`Metrics file not found: ${metricsRel}`);
  }

  const postFile = await findPostFileForId(postId);
  const postContent = postFile ? await readRepoFile(postFile) : '';
  const lessons = await readRepoFile('instagram/lessons.md');

  const system = await loadChatModePrompt('ig-reviewer');

  const userMsg = [
    `Review the following Instagram post performance and append new lessons.`,
    '',
    `--- Post file (${postFile || 'unknown'}) ---`,
    postContent || '(not found)',
    '',
    `--- Metrics (${metricsRel}) ---`,
    metrics,
    '',
    '--- Existing lessons.md ---',
    lessons || '(empty)',
    '',
    'Output the JSON review block, then a "## YYYY-MM-DD review" markdown section ',
    'containing only the new lesson bullets to append. Use today as the date.',
  ].join('\n');

  console.log(`[reviewer] reviewing post ${postId}...`);
  const fullText = await callClaude({ system, user: userMsg, maxTokens: 3000 });

  const date = todayISO();
  const newSection = extractLessonsSection(fullText, date);

  if (append) {
    const current = lessons || '# Instagram Lessons Learned\n\n> Append-only. Newest entries at the bottom.\n\n';
    const updated = current.endsWith('\n') ? current + '\n' + newSection : current + '\n\n' + newSection;
    await writeRepoFile('instagram/lessons.md', updated);
    console.log(`[reviewer] appended new lessons for ${date}`);
  }

  return { fullText, newSection };
}

// CLI entry point
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const postId = process.argv[2];
  if (!postId) {
    console.error('Usage: node reviewer.js <post_id>');
    process.exit(1);
  }
  runReviewer(postId)
    .then((r) => console.log('\n=== APPENDED ===\n' + r.newSection))
    .catch((e) => { console.error(e); process.exit(1); });
}
