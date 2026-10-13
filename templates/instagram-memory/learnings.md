# Learnings

Hypotheses about what works for this account. Three states:
- **Active** — being tested, not enough evidence yet.
- **Confirmed** — 3+ supporting posts with consistent results.
- **Killed** — 3+ disconfirming posts, or one decisive failure.

Each entry must cite post IDs as evidence. Be conservative about graduating to Confirmed.

---

## Active hypotheses

### A1 — Evening posts (17:00–19:00) reach more accounts than morning posts
- Supporting: none yet
- Disconfirming: none yet
- Status: needs testing.

### A2 — Question-style hooks outperform statement hooks
- Supporting: none yet
- Status: needs testing.

### A3 — Single-subject photos outperform busy or multi-panel images
- Supporting: none yet
- Status: needs testing.

### A4 — Niche hashtags (3–6 total, small audiences) outperform broad mega-tags
- Supporting: none yet
- Status: needs testing.

---

## Confirmed

*(none yet — every hypothesis needs ≥3 supporting posts before it lands here)*

---

## Killed

*(none yet)*

---

## Observations (not yet hypotheses)

*(none yet)*

## How the daily run uses this file

The agent picks the **Active hypothesis with the fewest supporting posts** and writes today's caption to test it. The hypothesis text gets copied verbatim into `post-log.md` under "Hypothesis tested". After T+48h, the agent comes back, refreshes metrics, and either adds to the supporting list, adds to disconfirming, or graduates/kills the hypothesis.
