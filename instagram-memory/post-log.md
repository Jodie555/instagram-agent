# Post log

Newest at the top. Bootstrapped 2026-05-24 from `instagram\posts\` and `instagram\metrics\`. Earlier posts that pre-date this log (and posts with `stub_*` IDs) are not included — only the most recent published posts with real Instagram post IDs.

The agent prepends a new entry each run. After T+48h, the `Metrics (T+48h): pending` line is replaced with real numbers.

---

## 2026-05-24 — 18325449280267865
- Caption hook: "Feel the steam rising, carrying the soul-warming aroma of perfectly simmered broth."
- Hashtags (count): 8
- Hypothesis tested: A3 — Single-subject photos outperform multi-panel collages
- Format: single image (Tokyo ramen, single-subject portrait)
- Image url: https://lh3.googleusercontent.com/pw/AP1GczOSjZiXwvBE0OVBlG2vQ688PSyajE8tGYSVN2T8duUEZy_eb0ezYiYUA8pKX5qgk3kqGdm2zbzy97mJkY4iXzO7S6xjWPtRBfFXY4_eKRriGkWCOOsZ=w1080
- Source draft: `instagram\posts\2026-05-24-v7.md`
- Publish path: explicit fallback — `pick_photo_from_album` → `publish_post` directly (auto_pipeline kept failing on the publish step with code 9007 "Media ID is not available" due to a container-readiness race; calling `publish_post` separately, after the IG container had been processing for several minutes, succeeded). User-directed retry after the autonomous run stopped per hard rule #3.
- review_post: passed (`reviewed: true`)
- Metrics (T+48h): pending  (refresh on 2026-05-26)

## 2026-05-24 — FAILED (publish step, IG media not ready)
- Run: scheduled 9am pipeline (evening UTC slot)
- Hypothesis attempted: A3 — single-subject photo outperforms multi-panel collage
- Topic: Tokyo ramen — single steaming bowl, clean single-subject portrait
- 1st `auto_pipeline` call (no album URL): failed with `OAuthException code 9004 subcode 2207052` — pipeline fell back to `https://example.com/placeholder.jpg`, IG rejected the URL ("Only photo or video can be accepted as media type"). Photo picker did not run because no `google_album_url` was passed.
- 2nd `auto_pipeline` call (with `google_album_url=https://photos.app.goo.gl/FvgbMr5RMG1n3CAP7`): media container created but publish failed with `OAuthException code 9007 subcode 2207027` — "Media ID is not available / 影音素材尚未準備好發佈" (container still processing when publish was attempted).
- Action taken: per playbook hard rule #3, **did not retry** publish. Posted nothing.
- Likely cause: auto_pipeline's internal poll interval between create-container and publish is too short for this account/image. The earlier IG token expiry (from earlier today) appears resolved — the container was accepted, just not ready in time.
- Suggested fix for the user: bump `auto_pipeline` `poll_seconds` (default 30) higher, or use the explicit fallback (`pick_photo_from_album` → write draft → `publish_post`) with a wait between container creation and publish. Also consider always passing `google_album_url` in the scheduled task prompt so the picker never falls back to the placeholder URL.


- Attempted live test at ~18:23 local; second attempt with explicit image URL at ~18:40 local
- Topic: Yanaka tea shop morning ritual; hypothesis: A3 single-subject vs collage
- Draft written: `instagram\posts\2026-05-24-v4.md` (caption + image prompt; clean against brand-voice rules)
- Picked image: `https://lh3.googleusercontent.com/pw/AP1GczM04530ECxyykDhPKGFpNGjowgcuzch7tPZDAmj6No4wqABk-75-H8iwJIwbWL5jGc2EHw3uahrGiNhMYLgve4HbXyvud6wXEKBhXTN-r3zMf3P5Ioz=w1080` (picked from user-supplied album https://photos.app.goo.gl/FvgbMr5RMG1n3CAP7)
- Error on `publish_post`: `IG media container error: OAuthException code 190 subcode 463 — "Session has expired on Sunday, 24-May-26 10:00:00 PDT. The current time is Sunday, 24-May-26 11:43:52 PDT."`
- Root cause: `IG_ACCESS_TOKEN` in `.env` expired today at 10:00 PDT. The earlier `auto_pipeline` timeout and the all-zero metrics across 7 posts are downstream symptoms of the same expired token.
- Action taken: per playbook hard rule, **did not retry**. Posted nothing.
- Fix required before tomorrow's 9am run: refresh `IG_ACCESS_TOKEN` in `C:\Users\Jodie\instagram-agent\.env` (Instagram long-lived tokens last ~60 days — use the IG Graph API token-refresh endpoint, or generate a new one from the Meta for Developers app).

## 2026-05-24 — 18100676180029875
- Caption hook: "🌸 Is Japan on your travel bucket list? Here's why it absolutely should be:"
- Hashtags (count): 14
- Hypothesis tested: (pre-bootstrap — not recorded)
- Format: single image — Mt Fuji + pagoda + cherry blossoms
- Image url: (see `instagram\used-images.json` — most recent entry)
- Source draft: `instagram\posts\2026-05-24-v2.md`
- Metrics (T+48h): pending  (refresh on 2026-05-26)

## 2026-05-23 — 18099874712018096
- Caption hook: "✨ Dreaming of Japan? Let us whisk you away to the Land of the Rising Sun… 🗾"
- Hashtags (count): 14
- Hypothesis tested: Evening posting (18:00) lifts engagement vs morning (A1)
- Format: single image with 4-panel collage prompt (Kyoto street + Mt Fuji + ramen + Tokyo neon)
- Image url: (see `instagram\used-images.json`)
- Source draft: `instagram\posts\2026-05-23-v5.md`
- Metrics (T+48h): pending  (refresh on 2026-05-25)

## 2026-05-23 — 18154765132465544
- Source draft: `instagram\posts\2026-05-23-v2.md`
- Metrics (T+48h): pending  (refresh on 2026-05-25)

## 2026-05-22 — 18117312688750053
- Source draft: `instagram\posts\2026-05-22-v5.md`
- Metrics (T+48h): likes=0, comments=0, reach=2, saves=0  (refreshed 2026-05-24T18:55Z)

## 2026-05-22 — 17948507355175196
- Source draft: `instagram\posts\2026-05-22-v4.md`
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-05-24T18:55Z)

## 2026-05-22 — 18103894532001991
- Source draft: `instagram\posts\2026-05-22-v3.md`
- Metrics (T+48h): likes=0, comments=0, reach=3, saves=0  (refreshed 2026-05-24T18:55Z)

## 2026-05-19 — 18089539370311940
- Source draft: `instagram\posts\2026-05-19-v6.md`
- Metrics (T+48h): likes=0, comments=0, reach=2, saves=0  (refreshed 2026-05-24T18:55Z)

## 2026-05-19 — 18115342165701660
- Source draft: `instagram\posts\2026-05-19-v5.md`
- Metrics (T+48h): pending  (refresh — overdue)

## 2026-05-18 — 18411845077179315
- Source draft: `instagram\posts\2026-05-18-v2.md`
- Metrics (T+48h): pending  (refresh — overdue)

## 2026-05-16 — 17974671393030434
- Source draft: `instagram\posts\2026-05-16-v7.md`
- Metrics (T+48h): pending  (refresh — overdue)

## 2026-05-16 — 18446233465116768
- Source draft: `instagram\posts\2026-05-16-v6.md`
- Metrics (T+48h): pending  (refresh — overdue)

## 2026-05-16 — 18151862203480151
- Source draft: `instagram\posts\2026-05-16-v5.md`
- Metrics (T+48h): pending  (refresh — overdue)

## 2026-05-16 — 18089747603356168
- Source draft: `instagram\posts\2026-05-16-v4.md`
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0 (from `instagram\metrics\18089747603356168.json`)

## 2026-05-16 — 18327362755266164
- Caption hook: "Japan is where ancient traditions meet cutting-edge innovation 🌸✨."
- Hashtags (count): 13
- Hypothesis tested: (pre-bootstrap — not recorded)
- Format: single image
- Permalink: https://www.instagram.com/p/DYaA4PHCJd9/
- Source draft: `instagram\posts\2026-05-16-v3.md`
- Metrics (T+48h): likes=0, comments=0, reach=1, impressions=null, saves=0 (from `instagram\metrics\18327362755266164.json`)
