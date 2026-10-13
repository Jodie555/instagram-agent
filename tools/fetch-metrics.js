#!/usr/bin/env node
/**
 * Fetch Instagram post metrics from the Graph API and cache them to
 * `instagram/metrics/<post_id>.json` for the reviewer agent.
 *
 * Usage:
 *   node tools/fetch-metrics.js <post_id>
 *
 * Requires env: IG_ACCESS_TOKEN (with instagram_manage_insights for reach/saved).
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './agents/llm.js'; // also loads .env
import { graphGet } from './agents/graph.js';

export async function fetchMetrics(postId) {
  // Basic counts + caption + timestamp.
  const media = await graphGet(`/${postId}`, {
    fields: 'like_count,comments_count,caption,timestamp,media_type,permalink',
  });

  // Insights (requires instagram_manage_insights).
  let reach = null;
  let saved = null;
  let impressions = null;
  let insightsNote = null;
  try {
    const insights = await graphGet(`/${postId}/insights`, {
      metric: 'reach,saved',
    });
    const getValue = (name) =>
      insights?.data?.find((d) => d.name === name)?.values?.[0]?.value ?? null;
    reach = getValue('reach');
    saved = getValue('saved');
  } catch (e) {
    insightsNote = `insights unavailable: ${e.message}`;
    console.warn(`[fetch-metrics] ${insightsNote}`);
  }

  const result = {
    id: postId,
    timestamp: media.timestamp ?? null,
    permalink: media.permalink ?? null,
    media_type: media.media_type ?? null,
    like_count: media.like_count ?? 0,
    comments_count: media.comments_count ?? 0,
    reach,
    impressions,
    saved,
    caption: media.caption ?? '',
    ...(insightsNote ? { note: insightsNote } : {}),
  };

  const dir = path.join(REPO_ROOT, 'instagram', 'metrics');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${postId}.json`);
  await fs.writeFile(file, JSON.stringify(result, null, 2));
  return { file, result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const postId = process.argv[2];
  if (!postId) {
    console.error('Usage: node tools/fetch-metrics.js <post_id>');
    process.exit(1);
  }
  fetchMetrics(postId)
    .then(({ file, result }) => {
      console.log(`[fetch-metrics] wrote ${path.relative(REPO_ROOT, file)}`);
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
