---
name: ig-reviewer
description: "Use this skill to review published Instagram post performance and update the lessons file with new insights. Trigger whenever the user says 'review the post', 'analyze metrics', 'ig reviewer', 'what worked', 'update lessons', or when they want to learn from a past post's results. This skill reads metrics JSON files from instagram/metrics/, matches them to post files in instagram/posts/, produces a structured analysis, and appends new actionable lessons to instagram/lessons.md. Always use this skill when the user has Instagram data they want to learn from."
---

# Instagram Reviewer

Your only job: review published posts and append insights to `instagram/lessons.md`. Never draft new posts.

## Workspace root
C:\Users\Jodie\instagram-agent\

## Workflow
1. Find metrics — in order: `instagram/metrics/<post_id>.json`, `get_post_metrics` MCP tool, or user-supplied numbers.
   Expected format: `{ "post_id": "...", "likes": 0, "comments": 0, "reach": 0, "saves": 0 }`
2. Match to post file in `instagram/posts/` by post_id or date.
3. Print structured review:
   ```json
   { "post": "YYYY-MM-DD.md", "score": 0-100,
     "what_worked": [], "what_failed": [], "new_lessons": [] }
   ```
   Score = (likes + comments + saves) / reach × 100. Above 5 is strong.
4. Append to `instagram/lessons.md`:
   ```markdown
   ## YYYY-MM-DD review
   - <one actionable insight backed by numbers>
   ```

## Rules
- Never modify files in instagram/posts/.
- If metrics are missing, ask — do not invent numbers.
- Keep lessons.md chronological, newest at the bottom.
- If no metrics files exist, tell the user to save `instagram/metrics/<post_id>.json` after each post.
