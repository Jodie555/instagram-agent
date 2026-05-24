# Learnings

Hypotheses about what works for this account. Three states:
- **Active** — being tested, not enough evidence yet.
- **Confirmed** — 3+ supporting posts with consistent results.
- **Killed** — 3+ disconfirming posts, or one decisive failure.

Each entry must cite post IDs as evidence. Be conservative about graduating to Confirmed.

---

## Active hypotheses

### A1 — Evening posts (17:00–19:00) reach more accounts than morning posts
- Supporting: `18099874712018096` (2026-05-23, 18:00 target) — reach pending
- Disconfirming: none yet
- Status: 1 post in, need 2 more before deciding.

### A2 — Question-style hooks outperform exclamation-style hooks
- Supporting: `18327362755266164` ("If Japan is on your bucket list, what's the one thing you'd love to experience first?") — reach 1
- Disconfirming: none yet
- Status: weak signal, sample size 1.

### A3 — Single-subject photos outperform multi-panel collages
- Supporting: none with confirmed metrics yet
- Anti-evidence: `18099874712018096` used a 4-panel collage image prompt — visually busy, reach so far = 1
- Status: priority hypothesis. Next 3 posts should be single-subject.

### A4 — Caption length 80–180 words outperforms 200+ word captions
- Supporting: none yet
- Status: needs testing.

### A5 — Hashtags 5–10 outperforms 13+ hashtag captions
- Anti-evidence on the 13+ side: `18327362755266164` had 13 hashtags, reach 1; `18099874712018096` had 14 hashtags, low engagement so far.
- Status: priority hypothesis. Default new posts to 7 hashtags and watch for lift.

---

## Confirmed

*(none yet — every hypothesis needs ≥3 supporting posts before it lands here)*

---

## Killed

*(none yet)*

---

## Observations (not yet hypotheses)

- **2026-05-24 (live refresh):** All 7 most-recent posts return **0 likes, 0 comments, 0 reach, 0 saves**. The previous reach=1 on `18327362755266164` is the only non-zero data point on record. This means caption / hashtag / posting-time A/B tests cannot produce measurable signal until the distribution floor is raised. The binding constraint is upstream of caption craft.
- 2026-11-02: Account permissions may be limiting available metrics (impressions = null on some posts).
- 2026-11-02: Initial engagement is low across the board — posting time or distribution may be the limiter.
- 2026-11-03: Even optimized posting times need promotional support (stories, cross-promotion) for reach.
- 2026-11-03: Try alternative formats (carousels, reels) once we have a clean single-image baseline.
- 2026-11-03: Hashtag set has been generating minimal engagement — needs refresh.

## Reflection — 2026-05-24

With every post at zero, no hypothesis was graduated or killed today. A1–A5 remain Active. The priority for the user (not the agent) is to address distribution before more caption iterations — recommend checking IG account access tier, posting to Stories, and tagging location/people in posts.

## Reflection — 2026-05-24 (evening refresh)

Refreshed metrics for the latest 7 posts. Likes/comments/saves are still 0 across the board. Reach now shows tiny positive numbers on 4 of 7 (`18099874712018096`=2, `18117312688750053`=2, `18103894532001991`=3, `18089539370311940`=2). These are too small (and likely include the account owner) to confirm or kill anything — we still need ≥3 supporting posts at a comparable engagement floor.

The earlier IG token expiration (logged in `post-log.md`) was almost certainly the reason both `auto_pipeline` and `publish_post` failed earlier today; if the token is now refreshed, the next post will be the first published since the fix. Today's hypothesis to test: **A3 (single-subject photo outperforms multi-panel collage)** — fewest supporting posts among Active hypotheses, and the most actionable lever the agent controls.

## How the daily run uses this file

The agent picks the **Active hypothesis with the fewest supporting posts** and writes today's caption to test it. The hypothesis text gets copied verbatim into `post-log.md` under "Hypothesis tested". After T+48h, the agent comes back, refreshes metrics, and either adds to the supporting list, adds to disconfirming, or graduates/kills the hypothesis.
