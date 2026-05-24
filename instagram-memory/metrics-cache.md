# Metrics cache

Refreshed: 2026-05-24T18:55Z (live via `mcp__instagram__get_post_metrics`)

This file is overwritten by the agent at the start of every run. Snapshot of the 7 most-recent posts from `post-log.md`.

| post_id | published | likes | comments | reach | saves |
|---|---|---|---|---|---|
| 18325449280267865 | 2026-05-24T~19:00Z | 0 | 0 | 0 | 0 |
| 18100676180029875 | 2026-05-24T15:44Z | 0 | 0 | 0 | 0 |
| 18099874712018096 | 2026-05-23T13:59Z | 0 | 0 | 2 | 0 |
| 18154765132465544 | 2026-05-23 | 0 | 0 | 0 | 0 |
| 18117312688750053 | 2026-05-22 | 0 | 0 | 2 | 0 |
| 17948507355175196 | 2026-05-22 | 0 | 0 | 0 | 0 |
| 18103894532001991 | 2026-05-22 | 0 | 0 | 3 | 0 |

## Top recent performer

`18103894532001991` (2026-05-22) — reach=3, all other engagement zero.

Tiebreaker fallback (likes+comments+saves): all zero. Using reach as the fallback per playbook §8.

## What this means for hypothesis testing

Reach has crept up slightly on a few posts (1–3 each), but likes/comments/saves remain zero across every refreshed post. That means we still have effectively no A/B signal on caption craft, hook style, or hashtag count — reach in the single digits is indistinguishable from noise.

The binding constraint remains upstream of caption craft (distribution / discoverability / token/account health). Yesterday's `publish_post` failure traced to an expired `IG_ACCESS_TOKEN` — if that has been refreshed, today's reach numbers should be watched for a step-change.

**Recommendation for the agent:** continue producing posts that follow `brand-voice.md`; do not graduate or kill any hypothesis on this data; surface the persistent zero-engagement pattern to the user in today's summary.
