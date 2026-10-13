/**
 * Failure alerts.
 *
 * Set ALERT_WEBHOOK_URL in .env to get a message when the pipeline fails:
 *   ntfy.sh  — https://ntfy.sh/<your-secret-topic>  (free phone push; install the ntfy app
 *              and subscribe to the same topic. Pick a hard-to-guess topic name.)
 *   Discord  — a channel webhook URL (https://discord.com/api/webhooks/...)
 *   Slack    — an incoming webhook URL (https://hooks.slack.com/...)
 *
 * Unset = alerts are only written to the console. Sending an alert never throws.
 */

import './llm.js'; // loads .env

// Never send secrets to the webhook, even if an error message contains one.
function redact(text) {
  return String(text)
    .replace(/(access_token|refresh_token|client_secret|token)=([^&\s"']+)/gi, '$1=***')
    .replace(/Bearer\s+[\w.\-]+/gi, 'Bearer ***');
}

export async function sendAlert(title, message) {
  const body = redact(`${title}\n${message}`).slice(0, 1800);
  console.error(`[alert] ${body}`);

  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;

  try {
    let opts;
    if (url.includes('discord.com')) {
      opts = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: body }) };
    } else if (url.includes('hooks.slack.com')) {
      opts = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: body }) };
    } else {
      // ntfy.sh and anything else that accepts a plain-text POST
      opts = { headers: { Title: redact(title).slice(0, 200), Priority: 'high', Tags: 'warning' }, body: redact(message).slice(0, 1800) };
    }
    const res = await fetch(url, { method: 'POST', ...opts, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) console.error(`[alert] webhook returned HTTP ${res.status}`);
  } catch (e) {
    console.error(`[alert] could not send alert: ${e.message}`);
  }
}
