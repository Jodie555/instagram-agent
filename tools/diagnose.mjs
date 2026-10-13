// IG account distribution diagnostic — pulls account state, follower count,
// recent post insights, and checks token validity / scopes.
// Reads token from instagram-agent/.env so we never log it.
//
// Usage: node tools/diagnose.mjs

import { GRAPH_BASE } from './agents/graph.js'; // also loads .env

const TOKEN = process.env.IG_ACCESS_TOKEN;
const USER_ID = process.env.IG_USER_ID;
const GRAPH = GRAPH_BASE;

async function gget(endpoint, params = {}) {
  const url = new URL(`${GRAPH}${endpoint}`);
  Object.entries({ ...params, access_token: TOKEN }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );
  const res = await fetch(url.toString());
  const json = await res.json();
  return json;
}

function redact(obj) {
  // never echo the token in any way
  return JSON.stringify(obj, (k, v) =>
    typeof v === 'string' && v === TOKEN ? '[REDACTED]' : v, 2);
}

console.log('=== TOKEN INFO ===');
const debugTok = await gget('/debug_token', { input_token: TOKEN });
if (debugTok.data) {
  const d = debugTok.data;
  console.log('  app_id:', d.app_id);
  console.log('  type:', d.type);
  console.log('  is_valid:', d.is_valid);
  console.log('  expires_at:', d.expires_at ? new Date(d.expires_at * 1000).toISOString() : 'never');
  console.log('  data_access_expires_at:', d.data_access_expires_at ? new Date(d.data_access_expires_at * 1000).toISOString() : 'n/a');
  console.log('  scopes:', (d.scopes || []).join(', '));
} else {
  console.log('  ERROR:', redact(debugTok));
}

console.log('\n=== IG ACCOUNT INFO ===');
const acct = await gget(`/${USER_ID}`, {
  fields: 'id,username,name,biography,followers_count,follows_count,media_count,account_type,profile_picture_url,website',
});
console.log(redact(acct));

console.log('\n=== RECENT MEDIA (last 10) ===');
const media = await gget(`/${USER_ID}/media`, {
  fields: 'id,caption,media_type,timestamp,like_count,comments_count,permalink',
  limit: 10,
});
if (media.data) {
  for (const m of media.data) {
    const cap = (m.caption || '').replace(/\n/g, ' ').slice(0, 60);
    console.log(`  ${m.timestamp}  ${m.media_type.padEnd(11)}  L:${String(m.like_count ?? '?').padStart(3)} C:${String(m.comments_count ?? '?').padStart(3)}  ${m.id}  "${cap}..."`);
  }
} else {
  console.log(redact(media));
}

console.log('\n=== INSIGHTS ON MOST RECENT POST ===');
if (media.data && media.data[0]) {
  const id = media.data[0].id;
  // Try a wide set of metrics — many require instagram_manage_insights AND business account
  const tries = [
    'reach,saved',
    'reach,saved,impressions',
    'reach,saved,impressions,profile_visits,follows',
    'reach,saved,total_interactions,profile_visits,follows,navigation,shares,plays,likes,comments',
  ];
  for (const metricSet of tries) {
    const r = await gget(`/${id}/insights`, { metric: metricSet });
    if (r.error) {
      console.log(`  metric set "${metricSet}" → ERROR: ${r.error.message} (code ${r.error.code}/${r.error.error_subcode || '-'})`);
      continue;
    }
    console.log(`  metric set "${metricSet}" → OK`);
    for (const d of r.data) {
      const v = d.values?.[0]?.value;
      console.log(`    ${d.name.padEnd(20)} = ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    }
    break; // stop on first successful
  }
}

console.log('\n=== ACCOUNT-LEVEL INSIGHTS (last 28 days) ===');
const since = Math.floor((Date.now() - 28 * 86400 * 1000) / 1000);
const until = Math.floor(Date.now() / 1000);
const acctInsights = await gget(`/${USER_ID}/insights`, {
  metric: 'reach,profile_views,accounts_engaged,follower_count',
  period: 'day',
  metric_type: 'total_value',
  since, until,
});
console.log(redact(acctInsights));

console.log('\n=== ACCOUNT-LEVEL FOLLOWER DEMOGRAPHICS (try) ===');
const demo = await gget(`/${USER_ID}/insights`, {
  metric: 'follower_demographics',
  period: 'lifetime',
  metric_type: 'total_value',
  breakdown: 'country',
});
console.log(redact(demo));
