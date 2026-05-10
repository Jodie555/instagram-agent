---
name: ig-optimizer
description: "Use this skill to run a full automated Instagram post optimization loop — 3 rounds of draft, self-score, and revise — before showing the user the best result. Trigger whenever the user says 'optimize a post', 'run the optimizer', 'best post about X', 'ig optimizer', or when they want the highest-quality draft possible rather than a quick single draft. Also trigger when the user says 'write a post' and seems to want thoroughness over speed. This skill reads lessons.md, runs 3 internal critique-and-revise rounds, saves the winner to instagram/posts/, and asks for publish confirmation."
---

# Instagram Post Optimizer

Run a 3-round improve loop automatically. Only stop to ask for the topic (if missing) and final approval.

## Workspace root
C:\Users\Jodie\instagram-agent\

## Step 1 — Gather context
1. Read `instagram/lessons.md`. Extract every lesson as a checklist. If empty, use Instagram best-practice defaults.
2. Skim last 5 files in `instagram/posts/` to avoid repeating hooks, topics, hashtag clusters.
3. If no topic given, ask once: "What topic should this post cover?" Then proceed without interruption.

## Step 2 — 3-round improve loop (no pausing between rounds)

Each round:

**A. Draft / Revise** — write a full post:
```
# Post — YYYY-MM-DD (Round N)
**Topic:** ...
**Best posting time:** HH:MM — cite the lesson
## Caption  (<= 2,200 chars, hook first line)
## Hashtags  (10–15, broad + niche mix)
## Image prompt
## Lessons applied
```

**B. Self-critique** — score each 0–10, total /50:
| Hook strength | Lessons adherence | Caption clarity | Hashtag quality | Call to action |
Print compact score table. Identify top 2 weaknesses.

**C. Revision plan** (rounds 1–2 only) — 2–3 bullets on what changes next round.

## Step 3 — Save the winner
After round 3, take the highest-scoring draft:
1. Write to `instagram/posts/YYYY-MM-DD.md` (append -v2/-v3 if exists).
2. Print: Scores: R1=X/50 | R2=Y/50 | R3=Z/50, improvements made, filename saved.
3. Ask: "Happy? Type publish / revise / discard."

## Rules
- Never publish without user typing "publish".
- Never edit lessons.md.
- Never overwrite existing post files.
- No clarifying questions mid-loop.
