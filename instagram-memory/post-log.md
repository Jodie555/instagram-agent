# Post log

---

## 2026-06-11 — FAILED (expired IG_ACCESS_TOKEN) [run 9]
- Run: scheduled 9am pipeline
- Hypothesis attempted: A7 — tagging 2–3 partner accounts drives more reach than hashtags alone
- Topic: Yanaka neighborhood Tokyo — narrow backstreet alley at dawn, artisan pottery, urban sub-theme
- Error: `OAuthException code 190 subcode 463` — "Session has expired on Sunday, 31-May-26 16:00:00 PDT. Current time: Thursday, 11-Jun-26 07:10:42 PDT."
- Root cause: `IG_ACCESS_TOKEN` in `.env` still the same expired token — not replaced since 2026-05-31. This is the **9th consecutive failed run** (11 days without a post).
- Action taken: per playbook hard rule #3, did not retry. Posted nothing.
- Fix required (CRITICAL — same fix required every run, nothing will publish until this is done):
  1. Go to Meta for Developers → your app → Tools → Graph API Explorer
  2. Generate a new User Access Token with `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` permissions
  3. Exchange it: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&access_token=<SHORT_TOKEN>`
  4. Store in `C:\Users\Jodie\instagram-agent\.env` as `IG_ACCESS_TOKEN=<new_token>`
  5. Long-lived tokens last ~60 days. Set a calendar reminder at day 50.

## 2026-06-08 — FAILED (expired IG_ACCESS_TOKEN) [run 8]
- Run: scheduled 9am pipeline
- Hypothesis attempted: A7 — tagging 2–3 partner accounts drives more reach than hashtags alone
- Topic: Yanaka neighborhood Tokyo — narrow backstreet alley, artisan craft, urban sub-theme
- Error: `OAuthException code 190 subcode 463` — "Session has expired on Sunday, 31-May-26 16:00:00 PDT. Current time: Monday, 08-Jun-26 15:58:00 PDT."
- Root cause: `IG_ACCESS_TOKEN` in `.env` still the same expired token — not replaced since 2026-05-31. This is the **8th consecutive failed run** (8 days without a post). The token has been expired for 8 days.
- Action taken: per playbook hard rule #3, did not retry. Posted nothing.
- Fix required (CRITICAL — same fix required every run, nothing will publish until this is done):
  1. Go to Meta for Developers → your app → Tools → Graph API Explorer
  2. Generate a new User Access Token with `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` permissions
  3. Exchange it: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&access_token=<SHORT_TOKEN>`
  4. Store in `C:\Users\Jodie\instagram-agent\.env` as `IG_ACCESS_TOKEN=<new_token>`
  5. Long-lived tokens last ~60 days. Set a calendar reminder at day 50.

## 2026-06-07 — FAILED (expired IG_ACCESS_TOKEN) [run 7]
- Run: scheduled 9am pipeline
- Hypothesis attempted: A7 — tagging 2–3 partner accounts drives more reach than hashtags alone
- Topic: Yanaka neighborhood Tokyo — narrow backstreet alley, artisan craft, urban sub-theme
- Error: `OAuthException code 190 subcode 463` — "Session has expired on Sunday, 31-May-26 16:00:00 PDT. Current time: Sunday, 07-Jun-26 02:03:16 PDT."
- Root cause: `IG_ACCESS_TOKEN` in `.env` still the same expired token — not replaced since 2026-05-31. This is the **7th consecutive failed run** due to the same root cause. No post has been published in 7 days.
- Action taken: per playbook hard rule #3, did not retry. Posted nothing.
- Fix required (CRITICAL — token has now been expired for 7 days, identical fix required every run):
  1. Go to Meta for Developers → your app → Tools → Graph API Explorer
  2. Generate a new User Access Token with `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` permissions
  3. Exchange it: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&access_token=<SHORT_TOKEN>`
  4. Store in `C:\Users\Jodie\instagram-agent\.env` as `IG_ACCESS_TOKEN=<new_token>`
  5. Long-lived tokens last ~60 days. Set a calendar reminder at day 50.

## 2026-06-06 — FAILED (expired IG_ACCESS_TOKEN) [run 2 of 2]
- Run: scheduled 9am pipeline (second attempt same day, ~09:10Z)
- Hypothesis attempted: A7 — tagging 2–3 partner accounts drives more reach than hashtags alone
- Topic: Yanaka neighborhood Tokyo — narrow backstreet alley, artisan craft, urban sub-theme
- Error: `OAuthException code 190 subcode 463` — "Session has expired on Sunday, 31-May-26 16:00:00 PDT. Current time: Saturday, 06-Jun-26 06:46:13 PDT."
- Root cause: `IG_ACCESS_TOKEN` in `.env` still the same expired token — not replaced since 2026-05-31. This is the **6th consecutive failed run** due to the same root cause.
- Action taken: per playbook hard rule #3, did not retry. Posted nothing.
- Fix required (CRITICAL — identical to all prior entries): exchange a NEW short-lived token for a 60-day long-lived token. Steps in the entry below.

## 2026-06-06 — FAILED (expired IG_ACCESS_TOKEN)
- Run: scheduled 9am pipeline
- Hypothesis attempted: A7 — tagging 2–3 partner accounts drives more reach than hashtags alone
- Topic: Yanaka neighborhood Tokyo — narrow backstreet alley, artisan craft shop, urban sub-theme
- Error: `OAuthException code 190 subcode 463` — "Session has expired on Sunday, 31-May-26 16:00:00 PDT. Current time: Saturday, 06-Jun-26 06:42:45 PDT."
- Root cause: `IG_ACCESS_TOKEN` in `.env` still expired — same token from 2026-05-31, never replaced. This is the **5th consecutive failed run** due to the same root cause.
- Action taken: per playbook hard rule #3, did not retry. Posted nothing.
- Fix required (CRITICAL): The token expiry date of "Sunday, 31-May-26 16:00:00 PDT" is identical across all failures — the short-lived token from the 2026-05-31 run has never been exchanged for a long-lived one. Steps to fix:
  1. Go to Meta for Developers → your app → Tools → Graph API Explorer
  2. Generate a new User Access Token with `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` permissions
  3. Exchange it for a long-lived token: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&access_token=<SHORT_TOKEN>`
  4. Store the returned `access_token` in `C:\Users\Jodie\instagram-agent\.env` as `IG_ACCESS_TOKEN=<new_token>`
  5. Long-lived tokens last ~60 days. Set a calendar reminder to refresh at day 50.

## 2026-06-04 — FAILED (expired IG_ACCESS_TOKEN)
- Run: scheduled 9am pipeline
- Hypothesis attempted: A7 — tagging 2–3 partner accounts drives more reach than hashtags alone
- Topic: Yanaka neighborhood Tokyo — quiet backstreet, artisan craft, urban sub-theme
- Error: `OAuthException code 190 subcode 463` — "Session has expired on Sunday, 31-May-26 16:00:00 PDT. Current time: Thursday, 04-Jun-26 01:03:15 PDT."
- Root cause: `IG_ACCESS_TOKEN` in `.env` expired again (same expiry date as 2026-06-03 failure — the 2026-05-31 token was short-lived and has never been replaced with a proper 60-day long-lived token).
- Action taken: per playbook hard rule #3, did not retry. Posted nothing.
- Fix required (CRITICAL — this is the 4th consecutive failed run): exchange a fresh short-lived token for a **long-lived token** via `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&access_token=<SHORT_TOKEN>`. Long-lived tokens last ~60 days. Store the result in `C:\Users\Jodie\instagram-agent\.env` as `IG_ACCESS_TOKEN=<new_token>`. Do NOT use a short-lived token directly — they expire in hours/days.

## 2026-06-03 — FAILED (expired IG_ACCESS_TOKEN)
- Run: scheduled 9am pipeline
- Hypothesis attempted: A7 — tagging 2–3 partner accounts drives more reach than hashtags alone
- Topic: Yanaka neighborhood Tokyo — quiet alleyway, artisan craft, urban sub-theme
- Error: `OAuthException code 190 subcode 463` — "Session has expired on Sunday, 31-May-26 16:00:00 PDT. Current time: Wednesday, 03-Jun-26 15:12:30 PDT."
- Root cause: `IG_ACCESS_TOKEN` in `.env` expired again. Token issued after the 2026-05-31 fix has now lapsed (~3 days, shorter than expected for a long-lived token — check if a short-lived token was used instead of a 60-day long-lived one).
- Action taken: per playbook hard rule #3, did not retry. Posted nothing.
- Fix required: refresh `IG_ACCESS_TOKEN` in `C:\Users\Jodie\instagram-agent\.env`. To get a 60-day long-lived token: exchange a short-lived token via `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&access_token=<SHORT_TOKEN>`. Long-lived tokens can also be refreshed before expiry via `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<LONG_TOKEN>`.

## 2026-05-31 — 17876038611667883
- Caption hook: "Step into a storybook morning at Tokyo's Nezu Shrine 🌸."
- Hashtags (count): 4 (#NezuShrine #AzaleaSeason #BunkyoTokyo @visitjapanjp)
- Hypothesis tested: A5 — niche hashtags (3–6 small-audience) outperform mega-discovery tags
- Format: single image (Nezu Shrine azalea tunnel, single human-scale subject lower-right third)
- Image url: https://lh3.googleusercontent.com/pw/AP1GczPL1QkGoKkCCWNmDkdYblOduImAcSgH2f7zGdFQ_F7U18uG3xS0IdBUpvDwmSjLRi4PASfSVeWEu0aPqdV1htSyoB0tsmncg_O-ixZUu3tPgRfnnoPk=w1080
- Source draft: `instagram\posts\2026-05-31-v5.md`
- review_post: passed (auto_pipeline completed publish step)
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-06-03T09:00Z)

## 2026-05-31 — FAILED (expired IG_ACCESS_TOKEN)
- Run: scheduled 9am pipeline
- Hypothesis attempted: A5 — niche hashtags (3–6 small-audience) outperform mega-discovery tags
- Topic: Nezu Shrine azalea garden, Bunkyo Tokyo (nature sub-theme)
- Error: `OAuthException code 190 subcode 463` — "Session has expired on Sunday, 24-May-26 13:00:00 PDT."
- Root cause: `IG_ACCESS_TOKEN` in `.env` expired 2026-05-24 13:00 PDT and has not been refreshed since the last run.
- Action taken: per playbook hard rule #3, did not retry. Posted nothing.
- Fix required: refresh `IG_ACCESS_TOKEN` in `C:\Users\Jodie\instagram-agent\.env`. Instagram long-lived tokens last ~60 days — use the IG Graph API token-refresh endpoint or generate a new one from the Meta for Developers console.

---


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
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-05-31T09:00Z)

## 2026-05-24 — FAILED (publish step, IG media not ready)
- Run: scheduled 9am pipeline (evening UTC slot)
- Hypothesis attempted: A3 — single-subject photo outperforms multi-panel collage
- Topic: Tokyo ramen — single steaming bowl, clean single-subject portrait
- 1st `auto_pipeline` call (no album URL): failed with `OAuthException code 9004 subcode 2207052` — pipeline fell back to `https://example.com/placeholder.jpg`, IG rejected the URL ("Only photo or video can be accepted as media type"). Photo picker did not run because no `google_album_url` was passed.
- 2nd `auto_pipeline` call (with `google_album_url=<GOOGLE_ALBUM_URL>`): media container created but publish failed with `OAuthException code 9007 subcode 2207027` — "Media ID is not available / 影音素材尚未準備好發佈" (container still processing when publish was attempted).
- Action taken: per playbook hard rule #3, **did not retry** publish. Posted nothing.
- Likely cause: auto_pipeline's internal poll interval between create-container and publish is too short for this account/image. The earlier IG token expiry (from earlier today) appears resolved — the container was accepted, just not ready in time.
- Suggested fix for the user: bump `auto_pipeline` `poll_seconds` (default 30) higher, or use the explicit fallback (`pick_photo_from_album` → write draft → `publish_post`) with a wait between container creation and publish. Also consider always passing `google_album_url` in the scheduled task prompt so the picker never falls back to the placeholder URL.


- Attempted live test at ~18:23 local; second attempt with explicit image URL at ~18:40 local
- Topic: Yanaka tea shop morning ritual; hypothesis: A3 single-subject vs collage
- Draft written: `instagram\posts\2026-05-24-v4.md` (caption + image prompt; clean against brand-voice rules)
- Picked image: `https://lh3.googleusercontent.com/pw/AP1GczM04530ECxyykDhPKGFpNGjowgcuzch7tPZDAmj6No4wqABk-75-H8iwJIwbWL5jGc2EHw3uahrGiNhMYLgve4HbXyvud6wXEKBhXTN-r3zMf3P5Ioz=w1080` (picked from user-supplied album <GOOGLE_ALBUM_URL>)
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
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-05-31T09:00Z)

## 2026-05-23 — 18099874712018096
- Caption hook: "✨ Dreaming of Japan? Let us whisk you away to the Land of the Rising Sun… 🗾"
- Hashtags (count): 14
- Hypothesis tested: Evening posting (18:00) lifts engagement vs morning (A1)
- Format: single image with 4-panel collage prompt (Kyoto street + Mt Fuji + ramen + Tokyo neon)
- Image url: (see `instagram\used-images.json`)
- Source draft: `instagram\posts\2026-05-23-v5.md`
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-05-31T09:00Z)

## 2026-05-23 — 18154765132465544
- Source draft: `instagram\posts\2026-05-23-v2.md`
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-05-31T09:00Z)

## 2026-05-22 — 18117312688750053
- Source draft: `instagram\posts\2026-05-22-v5.md`
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-05-31T09:00Z; was reach=2 on 2026-05-24)

## 2026-05-22 — 17948507355175196
- Source draft: `instagram\posts\2026-05-22-v4.md`
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-05-24T18:55Z)

## 2026-05-22 — 18103894532001991
- Source draft: `instagram\posts\2026-05-22-v3.md`
- Metrics (T+48h): likes=0, comments=0, reach=0, saves=0  (refreshed 2026-05-31T09:00Z; was reach=3 on 2026-05-24)

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
