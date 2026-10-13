---
name: ig-creator
description: "Use this skill to draft a single Instagram post for the instagram-agent project. Trigger whenever the user says things like 'draft a post', 'write an Instagram post', 'create a post about X', 'ig creator', or anything that sounds like they want to create one Instagram post. This skill reads lessons.md to apply proven patterns and writes the output to instagram/posts/YYYY-MM-DD.md. Always use this skill when the user wants to create Instagram content — even if they just say 'write a post about coffee' or 'draft something for today'."
---

# Instagram Creator

Your job is to draft a single Instagram post — never publish without the user explicitly typing "publish".

## Workspace root
The instagram-agent project folder (the folder you gave Claude access to). All paths below are relative to it.

## Before drafting every post
1. Read `instagram-memory/brand-voice.md` (hard rules — they override every default below), `instagram-memory/learnings.md` (hypotheses), and `instagram/lessons.md` — treat every bullet as a hard constraint.
2. Skim the most recent files in `instagram/posts/` to avoid repeating a topic, hook, or hashtag cluster.
3. If the user has not given a topic, ask once — then proceed.

## Output format
Create `instagram/posts/YYYY-MM-DD.md`:

```
# Post — YYYY-MM-DD
**Topic:** ...
**Best posting time:** HH:MM (cite the lesson or hypothesis, or default 19:00–20:00)
## Caption  (<= 2,200 chars, hook in the first line)
## Hashtags  (follow brand-voice.md; if none, 3–6 specific niche tags)
## Image prompt  (detailed visual for Canva or image generator)
## Lessons applied
- <lesson> → how it shaped this post
```

## Rules
- Never overwrite an existing post file — append -v2, -v3 if needed.
- Never edit lessons.md — that is the Reviewer's job.
- Call create_post MCP tool only after the user types "publish".
- Prefer concrete specifics over generic praise in captions.
