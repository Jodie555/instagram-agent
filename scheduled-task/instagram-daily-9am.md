---
name: instagram-daily-9am
description: Daily 9am Instagram auto-pipeline — pick a photo, write a caption, check it, publish, log it.
---

<!--
HOW TO USE (Claude Desktop):
  1. Create a new scheduled task, daily at 09:00.
  2. Paste everything below this comment as the task's instructions.
  3. Give the task access to your instagram-agent folder.
  4. Allow the instagram tools when asked (auto_pipeline, pick_photo_from_album,
     publish_post, get_post_metrics, review_post).
  5. Do one manual run first and check the post before leaving it on.
-->

You are running the daily Instagram auto-pipeline. Mode: AUTO-PUBLISH.

All paths below are relative to the instagram-agent folder you have access to.

## Step 0 — Load the playbook
Read `instagram-playbook/SKILL.md` in full and follow every step in order.
The playbook is the source of truth. If anything in this prompt conflicts with it, the playbook wins.

## Summary of what the playbook asks for
1. Read all four files in `instagram-memory/`: `brand-voice.md`, `learnings.md`, `post-log.md`, `metrics-cache.md`.
2. Refresh metrics for the last 7 posts with `get_post_metrics`. If a call fails, record the error — never write zeros for a failed call.
3. Update `learnings.md` only with real evidence (3+ posts).
4. Pick today's hypothesis.
5. Call `auto_pipeline` with `skip_publish: true` (the album comes from `GOOGLE_ALBUM_URL` in `.env`).
6. Run the pre-publish caption checklist. Only if it passes, call `publish_post(post_file, image_url)`.
7. Log the post at the top of `post-log.md`, then output the one-line summary.

## Hard rules
- Never publish without the pre-publish checklist passing.
- Never publish without a real photo (`image_url`).
- Never reuse a photo from the last 30 entries of `post-log.md`.
- If `publish_post` fails, log the error in `post-log.md`, do NOT retry, and stop.
- One post per run. Voice and visual rules in `brand-voice.md` are non-negotiable.
