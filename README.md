# Instagram Agent

An AI assistant that runs an Instagram account for you. Each run it:

1. **Picks a photo** from your Google Photos shared album (AI looks at the options and chooses).
2. **Writes the caption**: drafts, critiques and rewrites it 3 times, following your brand rules.
3. **Checks it** against a pre-publish checklist.
4. **Publishes** it to Instagram.
5. **Learns**: 48 hours later it reads the likes, reach and saves, and updates its notes on what works.

You can run it by chatting in **Claude Desktop** or **VS Code**, from the **terminal**, or on a **daily schedule** (e.g. every morning at 9).

The repo ships with a worked example, a Japan travel account (`instagram-memory/`, `instagram/posts/`). Run `new-account` (below) to swap it for blank templates for your own account.

---

## What you need

| | Why | Cost |
|---|---|---|
| **Instagram Business or Creator account**, linked to a **Facebook Page** | Meta only allows automated posting for professional accounts | Free |
| **Meta developer app** | To get an access token | Free |
| **Claude Pro or Max subscription** + **Claude Code** | Writes captions and picks photos (uses Haiku 5.5 by default) | Your subscription |
| **Node.js 20 or newer** ([nodejs.org](https://nodejs.org), LTS) | Runs the project | Free |
| **Google Photos shared album** | Where photos come from | Free |
| Claude Desktop *(optional)* | Chat with it / schedule the daily post | Free app |

The setup script is for **Windows**. On Mac or Linux, follow the terminal path.

---

## Setup — Claude Desktop (Windows, no coding)

1. **Download the project**: on GitHub click **Code → Download ZIP**, then unzip it somewhere, e.g. `Documents\instagram-agent`. (Or `git clone` it.)
2. **Install Node.js** (LTS) from [nodejs.org](https://nodejs.org).
3. **Install Claude Code and log in.** Open PowerShell and run:
   ```powershell
   npm install -g @anthropic-ai/claude-code
   claude
   ```
   Log in with your Claude account when asked, then type `/exit`.
4. **Double-click `run-setup.bat`** in the project folder. It installs everything, creates your `.env` settings file (it opens in Notepad), and connects the project to Claude Desktop **without touching your other Claude Desktop settings**.
5. **Fill in `.env`**: your Instagram token and account id (see [Get your Instagram token](#get-your-instagram-token)) and your album link (see [Photo album](#photo-album)).
6. **Check it works**: in PowerShell, from the project folder, run:
   ```powershell
   node tools\diagnose.mjs
   ```
   You should see your account name and `expires_at: never`.
7. **Restart Claude Desktop**: quit it fully from the system-tray icon, then reopen it.
8. **Try it**: in Claude Desktop, give Claude access to the project folder and say *"Write a post about <topic>"*.

## Setup — VS Code / terminal (Windows, Mac, Linux)

```bash
git clone https://github.com/Jodie555/instagram-agent.git
cd instagram-agent
cd tools && npm ci && cd ..
cp .env.example .env          # then edit .env
npm install -g @anthropic-ai/claude-code && claude   # log in once, then /exit
node tools/diagnose.mjs       # check your Instagram token
```

Then:

```bash
# Draft only (nothing is published)
node tools/auto-pipeline.js "Kyoto bamboo forest at sunrise" --skip-publish

# Full run: pick photo → write → publish
node tools/auto-pipeline.js "Kyoto bamboo forest at sunrise" --skip-review
```

In **VS Code**, the `.vscode/mcp.json` file registers the project's tools automatically. Pick the `ig-optimizer`, `ig-creator` or `ig-reviewer` chat mode and ask for a post.

---

## Start your own account

The repo contains the example Japan travel account. To start fresh:

```bash
node tools/new-account.js          # shows what will move (nothing changes yet)
node tools/new-account.js --yes    # moves the example to examples/japan-travel/ and installs blank templates
```

Then edit **`instagram-memory/brand-voice.md`**. It's the most important file: your niche, audience, tone, hashtag rules and visual rules. The AI treats everything in it as hard rules. Use `examples/japan-travel/instagram-memory/brand-voice.md` as a model.

| File | What it is |
|---|---|
| `instagram-memory/brand-voice.md` | Your rules: voice, caption style, hashtags, visuals, topics |
| `instagram-memory/learnings.md` | Hypotheses being tested (e.g. "evening posts get more reach") |
| `instagram-memory/post-log.md` | Log of every post (written by the daily run) |
| `instagram-memory/metrics-cache.md` | Latest metrics snapshot |
| `instagram-playbook/SKILL.md` | The step-by-step procedure the daily run follows |

---

## Get your Instagram token

You need two values in `.env`: `IG_ACCESS_TOKEN` and `IG_USER_ID`. These steps give you a **Page token that doesn't expire**, so you don't have to renew it every 60 days. (Meta changes its screens from time to time, so names may differ slightly.)

1. **Make your Instagram account professional and link a Page.** In the Instagram app: *Settings → Account type and tools → Switch to professional account*. Then link it to a Facebook Page you manage (create one if needed).
2. **Create a Meta app** at [developers.facebook.com](https://developers.facebook.com) → *My Apps → Create App*. Choose a **Business** type app and add the **Instagram** product (*Instagram API with Facebook Login*). Note the **App ID** and **App Secret** (*App settings → Basic*).
3. **Get a short-lived user token**: open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/), select your app, click *Generate Access Token*, and grant these permissions:
   `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `business_management`
4. **Swap it for a long-lived user token.** Open this URL in your browser with your values filled in:
   ```
   https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN
   ```
   Copy the `access_token` from the result.
5. **Get the Page token:**
   ```
   https://graph.facebook.com/v24.0/me/accounts?access_token=LONG_USER_TOKEN
   ```
   Find your Page in the list. Its `access_token` is your **`IG_ACCESS_TOKEN`**, and its `id` is the Page id.
6. **Get your Instagram account id:**
   ```
   https://graph.facebook.com/v24.0/PAGE_ID?fields=instagram_business_account&access_token=PAGE_TOKEN
   ```
   The `instagram_business_account.id` is your **`IG_USER_ID`**.
7. Put both in `.env` and run `node tools/diagnose.mjs`. It should show your username and `expires_at: never`.

Keep `.env` private: anyone with the token can post to your account. If the token ever stops working (for example after a password change), repeat steps 3–6.

## Photo album

In Google Photos: open an album → **Share → Create link**, and put it in `.env` as `GOOGLE_ALBUM_URL`. Each run, the AI looks at up to 10 unused photos and picks one. Photos that get posted are recorded in `instagram/used-images.json` so they aren't reused.

⚠️ **Anyone with the link can see every photo in the album.** Use an album made just for this, and never put the link in a public file.

---

## Post automatically every day

In Claude Desktop, create a **scheduled task** (e.g. daily at 09:00) and paste in the instructions from [`scheduled-task/instagram-daily-9am.md`](scheduled-task/instagram-daily-9am.md). Give it access to the project folder and allow the instagram tools when asked. **Do one manual run first** and check the post before you leave it on.

Each daily run refreshes metrics for recent posts, updates the hypotheses, writes and checks a caption, publishes, and logs the post.

Tip: posting several times a day can get a new account throttled by Instagram. One post a day is plenty.

---

## Settings (`.env`)

See [`.env.example`](.env.example) for the full list. The main ones:

| Setting | What it does |
|---|---|
| `IG_ACCESS_TOKEN`, `IG_USER_ID` | Your Instagram account (required to publish) |
| `GOOGLE_ALBUM_URL` | Photo album to choose from |
| `LLM_BACKEND=claude-code` | Use your Claude subscription through Claude Code (default) |
| `LLM_MODEL` | Change the model, e.g. `claude-sonnet-5-5` (default `claude-haiku-5-5`) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Use an API key instead of your subscription (required for Docker) |
| `IG_GRAPH_VERSION` | Instagram API version (default `v24.0`) |
| `CANVA_*` | Optional: put text on a Canva template instead of posting raw photos |

**Usage:** each post takes a handful of AI calls, which count toward your Claude subscription's usage limits. With Haiku that's small.

**Docker:** `docker compose run --rm pipeline "<topic>"` works too, but the container can't use your Claude subscription. Put `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY` plus `DOCKER_LLM_BACKEND=openai`) in `.env`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Session has expired` / `code 190` | Your Instagram token expired. Get a new one (see above). The Page-token method doesn't expire. |
| `could not start claude CLI` (in Claude Desktop) | Add `CLAUDE_CLI=C:\Users\<you>\AppData\Roaming\npm\claude.cmd` to `.env`, then restart Claude Desktop. |
| `claude CLI error` / not logged in | Run `claude` in a terminal and log in again. |
| `No images found in the shared album page` | The album link isn't shared publicly. Create a share link in Google Photos. |
| `No image URL — refusing to publish` | Photo picking failed (see the error before it). The run stops instead of posting without a photo. |
| Claude Desktop doesn't show the instagram tools | Run `run-setup.bat` again, then fully quit and reopen Claude Desktop. |
| Anything else | Run `node tools/diagnose.mjs` and read the errors. |

---

## How it fits together

```
tools/
  auto-pipeline.js        run everything from the terminal
  ig-mcp-server.js        the same steps as tools for Claude Desktop / VS Code
  diagnose.mjs            check your Instagram token and account
  new-account.js          swap the example account for blank templates
  fetch-metrics.js        save a post's metrics to instagram/metrics/
  agents/
    llm.js                AI backend (Claude Code subscription, or API keys)
    optimizer.js          3-round write → critique → rewrite
    photo-picker.js       AI picks the best photo from the album
    publisher.js          posts to Instagram
    reviewer.js           turns metrics into lessons
    graph.js              Instagram Graph API settings
instagram-playbook/       procedure for the daily run
instagram-memory/         your account's rules, hypotheses and logs
instagram/posts/          drafted posts
scheduled-task/           instructions to paste into a Claude Desktop scheduled task
templates/                blank account files used by new-account.js
skills/, .github/         chat modes / skills for Claude Desktop and VS Code
```

Notes:
- The `get_latest_google_photo` tool uses the Google Photos Library API, which Google restricted in 2025 to photos the app itself uploaded. Use the shared album (`GOOGLE_ALBUM_URL`) instead.
- The Canva step is optional and only runs when `CANVA_CLIENT_ID` and `CANVA_TEMPLATE_ID` are set (one-time login: `node tools/canva-auth.js`).
