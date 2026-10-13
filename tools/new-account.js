#!/usr/bin/env node
/**
 * Start your own account from the example data.
 *
 * Moves the current account data (memory files, drafts, lessons, used photos,
 * cached metrics) into examples/<name>/ for reference, then puts blank
 * templates from templates/ in their place. Does not touch .env.
 *
 * Usage:
 *   node tools/new-account.js                 # dry run: shows what would move
 *   node tools/new-account.js --yes           # do it (archives to examples/japan-travel)
 *   node tools/new-account.js --yes --name my-old-account
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { REPO_ROOT } from './agents/llm.js';

const args = process.argv.slice(2);
const confirmed = args.includes('--yes');
const nameIdx = args.indexOf('--name');
const name = nameIdx >= 0 ? args[nameIdx + 1] : 'japan-travel';
if (!name || !/^[\w-]+$/.test(name)) {
  console.error('--name must be letters, numbers, dashes or underscores.');
  process.exit(1);
}

const archiveRoot = path.join(REPO_ROOT, 'examples', name);
const rel = (p) => path.relative(REPO_ROOT, p);

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function listFiles(dir, filter) {
  try {
    return (await fs.readdir(dir)).filter(filter).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

// Files that belong to the current account.
const toArchive = [
  ...(await listFiles(path.join(REPO_ROOT, 'instagram-memory'), (f) => f.endsWith('.md'))),
  ...(await listFiles(path.join(REPO_ROOT, 'instagram', 'posts'), (f) => f.endsWith('.md'))),
  ...(await listFiles(path.join(REPO_ROOT, 'instagram', 'metrics'), (f) => f.endsWith('.json'))),
  path.join(REPO_ROOT, 'instagram', 'lessons.md'),
  path.join(REPO_ROOT, 'instagram', 'used-images.json'),
].filter(Boolean);

const present = [];
for (const f of toArchive) if (await exists(f)) present.push(f);

if (await exists(archiveRoot)) {
  console.error(`${rel(archiveRoot)} already exists. Pick another name: --name <something>`);
  process.exit(1);
}

console.log(`Will move ${present.length} file(s) into ${rel(archiveRoot)}/ and install blank templates:`);
for (const f of present.slice(0, 8)) console.log(`  ${rel(f)}`);
if (present.length > 8) console.log(`  ... and ${present.length - 8} more`);

if (!confirmed) {
  console.log('\nDry run only. Re-run with --yes to do it.');
  process.exit(0);
}

for (const f of present) {
  const dest = path.join(archiveRoot, rel(f));
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.rename(f, dest);
}

// Install templates.
const templates = path.join(REPO_ROOT, 'templates');
for (const sub of ['instagram-memory', 'instagram']) {
  for (const f of await listFiles(path.join(templates, sub), (x) => x.endsWith('.md'))) {
    const dest = path.join(REPO_ROOT, sub, path.basename(f));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(f, dest);
  }
}
await fs.writeFile(path.join(REPO_ROOT, 'instagram', 'used-images.json'), '[]\n');
await fs.mkdir(path.join(REPO_ROOT, 'instagram', 'posts'), { recursive: true });

console.log(`\nDone. The old account is in ${rel(archiveRoot)}/.`);
console.log('Next: fill in instagram-memory/brand-voice.md for your account, then write your first post.');
