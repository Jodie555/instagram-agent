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

### A5 — Niche hashtags (3–6 total, small-audience) outperform mega-discovery hashtags (5–10+ broad tags)
- Reframed 2026-05-24: the previous version treated hashtag *count* as the variable. The distribution audit (`tools/diagnose.mjs`, style guide) showed tag *size* is the actual lever. A small account is invisible in `#JapaneseFood` (millions of posts) but can rank in `#YanakaTokyo`.
- Anti-evidence on broad/large tag sets: `18327362755266164` (13 broad tags, reach 1); `18099874712018096` (14 broad tags, reach 2); `18325449280267865` (8 broad tags incl. `#InstantNoodles`, reach pending but trajectory matches).
- Status: priority hypothesis once posting resumes. Default new posts to 3 niche + 1 location/account tag and watch for lift.

### A6 — Long-form journalistic captions (subject + place + sensory detail + one piece of cultural context) outperform aesthetic-mood one-liners
- Source: cross-account analysis in `instagram-playbook/photography_instagram_style_guide.docx` — Steve McCurry, NatGeo, and Paul Nicklen all use this structure on documentary/culture content; ultra-short emoji captions worked for visual-signature accounts (Misshattan, Brandon Woelfel) but those rely on a distinct visual brand we don't have yet.
- Supporting: none with confirmed metrics yet
- Status: seeded, low priority — defer to A3/A5 while distribution floor is the binding constraint. Activate once any post reaches double-digit accounts.

### A7 — Tagging 2–3 partner accounts (location handles, JNTO, regional tourism boards, photographer credits) drives more reach than relying on hashtags alone
- Source: style guide §Hashtags and tags — McCurry tags `@magnumphotos` and `@veneziaphotofestival`; NatGeo always credits the contributing photographer. Account tagging surfaces posts to partner audiences without cluttering the caption.
- Supporting: none yet
- Status: seeded, ready to test. Cheap to add and doesn't disturb A3/A5. Next post should include one location tag and one credit tag where applicable.

### A8 — A branded series hashtag tied to a recurring sub-theme (e.g. `#YanakaThursdays`, `#TempleLight`) improves return-viewer rate over scattered topical hashtags
- Source: style guide — Misshattan's `#AirMisshattan` and Paul Nicklen's `#BanDeathNets` work as series markers, not discovery tags. They're part of the brand.
- Supporting: none yet
- Status: seeded, low priority. Requires committing to a recurring sub-theme first — propose this to the user before testing.

---

## Confirmed

*(none yet — every hypothesis needs ≥3 supporting posts before it lands here)*

---

## Killed

*(none yet)*

---

## Observations (not yet hypotheses)

- **Future test (blocked by A3):** Carousels vs single images. The style guide showed every solo photographer in the sample (McCurry, Misshattan, Burkard) leans heavily on carousels for time-on-post. Cannot test here until A3 (single-subject) is resolved — the current brand-voice rule mandates single image for clean a/b signal.

- **2026-05-24 (live refresh):** All 7 most-recent posts return **0 likes, 0 comments, 0 reach, 0 saves**. The previous reach=1 on `18327362755266164` is the only non-zero data point on record. This means caption / hashtag / posting-time A/B tests cannot produce measurable signal until the distribution floor is raised. The binding constraint is upstream of caption craft.
- 2026-11-02: Account permissions may be limiting available metrics (impressions = null on some posts).
- 2026-11-02: Initial engagement is low across the board — posting time or distribution may be the limiter.
- 2026-11-03: Even optimized posting times need promotional support (stories, cross-promotion) for reach.
- 2026-11-03: Try alternative formats (carousels, reels) once we have a clean single-image baseline.
- 2026-11-03: Hashtag set has been generating minimal engagement — needs refresh.

## Reflection — 2026-05-24

With every post at zero, no hypothesis was graduated or killed today. A1–A5 remain Active. The priority for the user (not the agent) is to address distribution before more caption iterations — recommend checking IG account access tier, posting to Stories, and tagging location/people in posts.

## Reflection — 2026-06-03 (9am scheduled run)

Fresh metrics refresh: all 7 most-recent posts at 0 across every metric. `17876038611667883` (2026-05-31 Nezu Shrine) T+48h backfilled at 0. No hypothesis graduated or killed. A1–A8 remain Active. Today's pipeline failed again with expired `IG_ACCESS_TOKEN` (code 190/463, expired 2026-05-31 16:00 PDT). This is the third token expiry event. The 2026-05-31 token appears to have been short-lived (~3 days) rather than the expected 60-day long-lived token. **Critical action required:** user must exchange a short-lived token for a proper long-lived token and store it in `.env`. Today's intended hypothesis was A7 (partner account tagging, urban/Yanaka sub-theme) — carry forward to next run.

## Reflection — 2026-05-31 (9am scheduled run)

Fresh metrics refresh for all 7 most-recent posts returns 0 across every metric — likes, comments, reach, saves. The reach=2–3 previously observed on `18099874712018096`, `18117312688750053`, and `18103894532001991` has dropped to 0 (IG API may not backfill reach beyond a window). No hypothesis has 3+ supporting posts; no hypothesis graduated or killed. A1–A8 remain Active. The distribution floor is still the binding constraint. Today's run tests **A5** (niche hashtags 3–6, small-audience) with A7 as a secondary (partner tag added, does not interfere). Topic: Nezu Shrine azalea garden (nature sub-theme, rotating from last post's food).

## Reflection — 2026-05-24 (evening refresh)

Refreshed metrics for the latest 7 posts. Likes/comments/saves are still 0 across the board. Reach now shows tiny positive numbers on 4 of 7 (`18099874712018096`=2, `18117312688750053`=2, `18103894532001991`=3, `18089539370311940`=2). These are too small (and likely include the account owner) to confirm or kill anything — we still need ≥3 supporting posts at a comparable engagement floor.

The earlier IG token expiration (logged in `post-log.md`) was almost certainly the reason both `auto_pipeline` and `publish_post` failed earlier today; if the token is now refreshed, the next post will be the first published since the fix. Today's hypothesis to test: **A3 (single-subject photo outperforms multi-panel collage)** — fewest supporting posts among Active hypotheses, and the most actionable lever the agent controls.

## Reflection — 2026-06-11 (9am scheduled run, run 9)

Fresh metrics refresh: all 7 most-recent posts at 0 across every metric. No hypothesis graduated or killed. A1–A8 remain Active. Pipeline failed again — same `OAuthException code 190/463`, same expiry (2026-05-31 16:00 PDT). This is the **9th consecutive failed run**. Account has not published in 11 days. A7 carries forward. Nothing will change until user replaces the token in `.env`.

## Reflection — 2026-06-08 (9am scheduled run, run 8)

Fresh metrics refresh: all 7 most-recent posts at 0 across every metric. No hypothesis graduated or killed. A1–A8 remain Active. Pipeline failed again — same `OAuthException code 190/463`, same expiry (2026-05-31 16:00 PDT). This is the **8th consecutive failed run**. Account has not published in 8 days. A7 carries forward. Nothing will change until user replaces the token in `.env`.

## Reflection — 2026-06-07 (9am scheduled run, run 7)

Fresh metrics refresh: all 7 most-recent posts at 0 across every metric. No hypothesis graduated or killed. A1–A8 remain Active. Pipeline failed again — same `OAuthException code 190/463`, same token expiry (2026-05-31 16:00 PDT). This is the **7th consecutive failed run**. The account has not published in 7 days. Token fix instructions have now been logged 7 times. Nothing will change until the user replaces the token in `.env`. Intended hypothesis A7 (partner account tagging, urban/Yanaka) carries forward to next run.

## Reflection — 2026-06-06 (9am scheduled run, run 2)

Second attempt same day. Fresh metrics refresh: all 7 most-recent posts still at 0. Pipeline failed again — same `OAuthException code 190/463`, same token expiry (2026-05-31 16:00 PDT). This is the **6th consecutive failed run**. Token has not been replaced. No post published since 2026-05-31. A1–A8 remain Active. **Action required from user:** the token fix instructions have been logged four times in `post-log.md` — nothing will publish until a valid 60-day long-lived token is stored in `.env`. Intended hypothesis A7 (partner account tagging, urban/Yanaka) carries forward again.

## Reflection — 2026-06-06 (9am scheduled run)

Fresh metrics refresh: all 7 most-recent posts at 0 across every metric. No hypothesis graduated or killed. A1–A8 remain Active. Today's pipeline failed again with expired `IG_ACCESS_TOKEN` (code 190/463, same expiry: 2026-05-31 16:00 PDT). This is the **5th consecutive failed run** due to the same root cause — the short-lived token from the 2026-05-31 successful post was never exchanged for a 60-day long-lived token. No new content has been published since 2026-05-31. **Urgent action required from user:** exchange a fresh short-lived token for a long-lived token (instructions in `post-log.md`). Today's intended hypothesis remains A7 (partner account tagging, urban/Yanaka sub-theme) — carry forward to next run.

## How the daily run uses this file

The agent picks the **Active hypothesis with the fewest supporting posts** and writes today's caption to test it. The hypothesis text gets copied verbatim into `post-log.md` under "Hypothesis tested". After T+48h, the agent comes back, refreshes metrics, and either adds to the supporting list, adds to disconfirming, or graduates/kills the hypothesis.
