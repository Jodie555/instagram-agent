#!/usr/bin/env node
/**
 * Full pipeline orchestrator.
 *
 * Steps:
 *   1. Optimize  — runs the 3-round loop and saves a post draft.
 *   2. Design    — autofills a Canva template and exports a PNG (requires CANVA_* env vars).
 *   3. Publish   — publishes the draft + image to Instagram (stub by default).
 *   4. Wait      — pauses until metrics are available (configurable).
 *   5. Review    — reads the metrics and appends new lessons.
 *
 * Usage:
 *   node tools/auto-pipeline.js "<topic>" [--image <url>] [--wait-hours <n>]
 *                                          [--skip-design] [--skip-publish] [--skip-review]
 *                                          [--metrics-poll-seconds <n>]
 *
 * Required env: ANTHROPIC_API_KEY
 * Optional env: CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_TEMPLATE_ID (for image generation)
 *               IG_ACCESS_TOKEN, IG_USER_ID (else publish runs in stub mode)
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { runOptimizer } from './agents/optimizer.js';
import { publishPost } from './agents/publisher.js';
import { runReviewer } from './agents/reviewer.js';
import { designPost } from './agents/canva-designer.js';
import { REPO_ROOT } from './agents/llm.js';

function parseArgs(argv) {
  const args = { topic: '', imageUrl: undefined, waitHours: 0, pollSeconds: 30, skipDesign: false, skipPublish: false, skipReview: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--image') args.imageUrl = argv[++i];
    else if (a === '--wait-hours') args.waitHours = Number(argv[++i]);
    else if (a === '--metrics-poll-seconds') args.pollSeconds = Number(argv[++i]);
    else if (a === '--skip-design') args.skipDesign = true;
    else if (a === '--skip-publish') args.skipPublish = true;
    else if (a === '--skip-review') args.skipReview = true;
    else positional.push(a);
  }
  args.topic = positional.join(' ');
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait for `instagram/metrics/<post_id>.json` to appear. If `waitHours` is 0,
 * just check once. Otherwise poll until found or timeout.
 */
async function waitForMetrics(postId, { waitHours, pollSeconds }) {
  const file = path.join(REPO_ROOT, 'instagram', 'metrics', `${postId}.json`);
  const deadline = Date.now() + waitHours * 3600 * 1000;
  let logged = false;

  while (true) {
    try {
      await fs.access(file);
      return file;
    } catch {
      // not yet
    }
    if (Date.now() >= deadline) return null;
    if (!logged) {
      console.log(`[pipeline] waiting for metrics file: instagram/metrics/${postId}.json`);
      console.log(`[pipeline]   (polling every ${pollSeconds}s, timeout in ${waitHours}h)`);
      logged = true;
    }
    await sleep(pollSeconds * 1000);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.topic) {
    console.error('Usage: node auto-pipeline.js "<topic>" [--image <url>] [--wait-hours <n>] [--skip-design] [--skip-publish] [--skip-review]');
    process.exit(1);
  }

  console.log(`\n===== Step 1: Optimize =====`);
  const { savedPath } = await runOptimizer(args.topic);

  let imageUrl = args.imageUrl;
  if (!args.skipDesign && !imageUrl) {
    const hasCanva = process.env.CANVA_CLIENT_ID && process.env.CANVA_TEMPLATE_ID;
    if (hasCanva) {
      console.log(`\n===== Step 2: Design (Canva) =====`);
      try {
        imageUrl = await designPost(savedPath);
      } catch (e) {
        console.warn(`[pipeline] Canva design failed (${e.message}). Continuing without image.`);
      }
    } else {
      console.log(`\n[pipeline] Step 2 skipped — set CANVA_CLIENT_ID + CANVA_TEMPLATE_ID to enable Canva design.`);
    }
  } else if (args.skipDesign) {
    console.log(`\n[pipeline] Step 2 skipped (--skip-design).`);
  }

  if (args.skipPublish) {
    console.log('\n[pipeline] --skip-publish set, stopping after draft.');
    return;
  }

  console.log(`\n===== Step 3: Publish =====`);
  const { post_id } = await publishPost({ postFile: savedPath, imageUrl });

  if (args.skipReview) {
    console.log('\n[pipeline] --skip-review set, stopping after publish.');
    return;
  }

  console.log(`\n===== Step 4: Wait for metrics =====`);
  const metricsFile = await waitForMetrics(post_id, { waitHours: args.waitHours, pollSeconds: args.pollSeconds });
  if (!metricsFile) {
    console.log(`[pipeline] no metrics yet for ${post_id}. Drop a JSON in instagram/metrics/ and run reviewer later:`);
    console.log(`           node tools/agents/reviewer.js ${post_id}`);
    return;
  }

  console.log(`\n===== Step 5: Review =====`);
  await runReviewer(post_id);

  console.log('\n[pipeline] Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
