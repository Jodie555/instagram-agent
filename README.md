# Instagram Multi-Agent Workspace

Three VS Code chat modes that work as a feedback loop:

| Mode | Role | Reads | Writes |
|---|---|---|---|
| `ig-creator` | Drafts a single post | `instagram/lessons.md`, `instagram/posts/` | `instagram/posts/YYYY-MM-DD.md` |
| `ig-reviewer` | Analyses published results | `instagram/metrics/`, `instagram/posts/` | `instagram/lessons.md` (append) |
| `ig-optimizer` | **Auto create→critique→revise loop (3 rounds)** | `instagram/lessons.md`, `instagram/posts/` | `instagram/posts/YYYY-MM-DD.md` |

The Optimizer runs automatically — no switching required. The Creator and Reviewer get smarter every publish cycle because they re-read `lessons.md` before running.

## Setup

```powershell
# 1. Open this folder in VS Code
code C:\Users\Jodie\instagram-agent

# 2. Install MCP server deps
cd tools
npm install
cd ..

# 3. (Optional) set your Instagram token for the MCP server
$env:IG_ACCESS_TOKEN = "your_long_lived_token"
```

## Daily workflow

### Automated (recommended)
1. **Optimize.** In Chat, switch the mode dropdown → `ig-optimizer` → *"Write a post about X."*  
   The agent drafts, self-scores, and revises **3 rounds automatically** then shows you the winner.
2. **Publish.** Type `publish` → the agent calls the MCP tool. Or post manually.
3. **Capture metrics.** Save analytics as `instagram/metrics/<post_id>.json` (see format below).
4. **Review.** Switch to `ig-reviewer` → *"Review the latest post."* New lessons are appended.
5. Loop — every new `ig-optimizer` run picks up the latest lessons automatically.

### Manual (one step at a time)
1. **Create.** Switch mode → `ig-creator` → *"Draft today's post about X."*
2. **Publish.** Type `publish` (uses the `instagram` MCP tool) — or post manually.
3. **Capture metrics.** Save analytics as `instagram/metrics/<post_id>.json`, e.g.:
   ```json
   { "post_id": "stub_123", "likes": 120, "comments": 14, "reach": 3400, "saves": 22 }
   ```
4. **Review.** Switch mode → `ig-reviewer` → *"Review the latest post."* It appends new bullets to `lessons.md`.
5. Loop. Next draft will pick up the new lessons automatically.

## Files

```
.github/
  chatmodes/
    ig-creator.chatmode.md
    ig-reviewer.chatmode.md
  instructions/
    lessons.instructions.md   # auto-applies to instagram/**
.vscode/
  mcp.json                    # registers the instagram MCP server
tools/
  ig-mcp-server.js            # stub — replace with real Graph API calls
  package.json
instagram/
  lessons.md                  # append-only memory
  posts/                      # creator output
  metrics/                    # reviewer input
```

## Switching to the real Instagram API

Open `tools/ig-mcp-server.js` and replace the two blocks marked
`=== REPLACE WITH REAL INSTAGRAM GRAPH API CALL ===` with calls to
`https://graph.facebook.com/v19.0/...` using `IG_ACCESS_TOKEN`.
