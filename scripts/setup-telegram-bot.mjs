#!/usr/bin/env node
// One-time (and after-redeploy) setup for the PassMark Telegram bot:
//   1. points Telegram's webhook at the telegram-webhook Edge Function
//   2. registers the slash commands shown in Telegram's "/" menu
//
// Usage:
//   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... SUPABASE_PROJECT_REF=... \
//     node scripts/setup-telegram-bot.mjs
//
// TELEGRAM_WEBHOOK_SECRET must be the SAME value set as a Supabase secret
// (`supabase secrets set TELEGRAM_WEBHOOK_SECRET=...`): Telegram sends it back
// in the X-Telegram-Bot-Api-Secret-Token header and the function rejects any
// update whose header doesn't match. Allowed characters: A-Z a-z 0-9 _ -

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const projectRef = process.env.SUPABASE_PROJECT_REF;

if (!token || !secret || !projectRef) {
  console.error('Missing env: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and SUPABASE_PROJECT_REF are all required.');
  process.exit(1);
}

if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
  console.error('TELEGRAM_WEBHOOK_SECRET must be 1-256 chars of A-Z a-z 0-9 _ - only.');
  process.exit(1);
}

const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/telegram-webhook`;

async function call(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${JSON.stringify(json)}`);
  return json.result;
}

const commands = [
  { command: 'start', description: 'Get started with PassMark' },
  { command: 'app', description: 'Open the PassMark app' },
  { command: 'new', description: 'Start a new conversation' },
  { command: 'history', description: 'Browse your past conversations' },
  { command: 'tokens', description: 'Check your token balance' },
];

try {
  await call('setWebhook', {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
  console.log(`✓ Webhook set → ${webhookUrl}`);

  await call('setMyCommands', { commands });
  console.log('✓ Commands registered:', commands.map((c) => `/${c.command}`).join(' '));

  const info = await call('getWebhookInfo', {});
  console.log('✓ Telegram reports:', JSON.stringify({ url: info.url, pending_update_count: info.pending_update_count }));
} catch (err) {
  console.error('✗', err.message);
  process.exit(1);
}
