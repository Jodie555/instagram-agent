---
name: instagram-playbook
description: Source-of-truth playbook for the daily 9am Instagram auto-pipeline. Memory-driven, hypothesis-tested. Business / product account, AUTO-PUBLISH.
---

# Instagram Daily 9am — Playbook

This is the source of truth. If the scheduled-task prompt and this file disagree, **this file wins**.

The account is a Japan travel / cultural content account. Posts are images with captions. The pipeline is hypothesis-driven: every post tests one explicit hypothesis from `learnings.md`, and metrics are reviewed 48h later to confirm or kill the hypothesis.

## Paths (single source of truth)

- Playbook: `C:\Users\Jodie\instagram-agent\instagram-playbook\SKILL.md` (this file)
- Memory folder: `C:\Users\Jodie\instagram-agent\instagram-memory\`
  - `brand-voice.md` — voice + visual constraints (non-negotiable)
  - `learnings.md` — hypotheses (Active / Confirmed / Killed) with evidence
  - `post-log.md` — newest-first log of every published post
  - `metrics-cache.md` — most recent metrics snapshot for the last 7 posts
- Draft posts (one per run): `C:\Users\Jodie\instagram-agent\instagram\posts\YYYY-MM-DD.md`
- Used-images dedupe: `C:\Users\Jodie\instagram-agent\instagram\used-images.json`
- Per-post metrics JSON: `C:\Users\Jodie\instagram-agent\instagram\metrics\<post_id>.json`

## Steps the agent must run, in order

### Step 1 — Read memory
Read all four files in `instagram-memory\` in full. Do not skim.

### Step 2 — Refresh metrics
For the last 7 entries in `post-log.md`, call `mcp__instagram__get_post_metrics(post_id)`. Overwrite `metrics-cache.md` with the fresh snapshot using the format in §"metrics-cache format" below. For any `Metrics (T+48h): pending` line in `post-log.md` where the post is now ≥48h old, replace it with the fresh numbers.

If a `get_post_metrics` call fails for a given id, leave that row as `error: <short reason>` in the cache — do not retry, do not stop the run.

### Step 3 — Reflect
Read the refreshed `metrics-cache.md` plus the metrics rows in `post-log.md`. Update `learnings.md` only when:
- A hypothesis has **3+ supporting posts** with consistent results → graduate to **Confirmed**.
- A hypothesis has **3+ disconfirming posts** → mark **Killed** with a one-line cause.
- A new pattern is visible in the data → add as **Active hypothesis** with the supporting post IDs.

Be conservative. If unsure, leave the hypothesis as Active.

### Step 4 — Pick the hypothesis to test today
Choose one Active hypothesis from `learnings.md` that has the fewest supporting posts (we want broad coverage). Record the exact hypothesis text — it goes into the post-log entry.

### Step 5 — Run the pipeline
Call `mcp__instagram__auto_pipeline` with:
- `topic`: a Japan-related theme aligned to today's hypothesis (e.g., "Kyoto bamboo forest at sunrise", "Tokyo street food", "onsen culture")
- Voice/style constraints from `brand-voice.md` summarized into the topic string if the tool doesn't accept them separately
- `skip_review: false`, `skip_publish: false`

`auto_pipeline` handles photo pick → design → caption → review → publish in one call.

**Fallback if `auto_pipeline` errors or is unavailable:**
1. `pick_photo_from_album` (or use a Google Photos URL from a recent run) → image_url
2. Write the post markdown to `instagram\posts\YYYY-MM-DD[-vN].md` following the existing template (Topic, Caption, Hashtags, Image prompt, Lessons applied)
3. `publish_post(post_file, image_url)` → post_id
4. `review_post(post_id)` — runs against the published post and appends to `instagram\lessons.md`

**Note on Canva design tools.** `design_post`, `canva_fill_template`, and `canva_export` require `CANVA_TEMPLATE_ID` (currently commented out in `.env`). This account uses Google-Photos URLs directly — do **not** call the Canva tools unless `CANVA_TEMPLATE_ID` is set. If asked to "test the design step", explain that the image comes from `pick_photo_from_album`, not Canva, on this account.

### Step 6 — Verify review passed
`review_post` writes lessons to `instagram\lessons.md`. If `review_post` returned an error or a "do not publish" signal in the auto_pipeline result, **do not** re-publish. Log the failure in `post-log.md` and stop.

### Step 7 — Log the post (newest at top)
Prepend a new entry to `post-log.md` using the exact format in §"post-log format" below.

### Step 8 — Notify
Output a single line: `Posted at 9am — <post_id> — testing: <hypothesis> — top recent performer: <post_id> (<metric>)`. Pull the top recent performer from `metrics-cache.md` (highest `like_count + comments + saves`, falling back to `reach` if all engagement is zero).

## Hard rules — never violate

1. **Never publish without review_post approving.** If review fails, log and stop.
2. **Never reuse a photo from the last 30 entries of `post-log.md`.** The pipeline also writes to `instagram\used-images.json` — treat that as the second guardrail.
3. **If `publish_post` fails, log the error in `post-log.md` and stop the run.** No retries.
4. **Voice and visual rules in `brand-voice.md` are non-negotiable.**
5. **Hashtags: 5–10 total.** No more, no fewer.
6. **Emojis: ≤2 in the caption body.** Hashtags don't count.
7. **One post per scheduled run.** Even if the run is late, do not publish a backlog.

## post-log format

Each entry is a single block, newest at the top of the file. Date is the **publish** date in UTC.

```
## 2026-05-24 — 18100676180029875
- Caption hook: "🌸 Is Japan on your travel bucket list? Here's why it absolutely should be:"
- Hashtags (count): 14
- Hypothesis tested: Evening posting time (18:00) improves reach vs. morning
- Format: single image
- Image url: <https url>
- Metrics (T+48h): pending  (refresh on 2026-05-26)
```

When the T+48h metrics are filled in, replace the placeholder line with:

```
- Metrics (T+48h): likes=12, comments=2, reach=340, saves=4
```

## metrics-cache format

Snapshot of the last 7 posts at the time of refresh. Newest first. Overwrite this file each run.

```
# Metrics cache — refreshed 2026-05-24T09:07:00Z

| post_id | published | likes | comments | reach | saves | age_h |
|---|---|---|---|---|---|---|
| 18100676180029875 | 2026-05-24T15:44Z | 0 | 0 | 0 | 0 | <2 |
| 18099874712018096 | 2026-05-23T13:59Z | 0 | 0 | 1 | 0 | 19 |
| ... | ... | ... | ... | ... | ... | ... |
```

## Notes on the existing repo

- `instagram\lessons.md` is the reviewer-written append-only log. `learnings.md` (in memory) is the curated, hypothesis-structured view. Both can coexist; `learnings.md` is what the agent reads each run.
- `instagram\posts\` contains both old and current drafts. The agent writes new drafts there each day.
- `instagram\metrics\<post_id>.json` is per-post raw data — `get_post_metrics` may populate this. The cache is the readable rollup.
