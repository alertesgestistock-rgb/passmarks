// Thin wrapper over the Telegram Bot API — only what the PassMark bot needs.
//
// Limits enforced here (from https://core.telegram.org/bots/api):
//   - sendMessage caps at 4096 UTF-8 chars → long AI answers are split
//   - bots may download files up to 20 MB via getFile
//   - ~1 message/second per chat, ~30/second overall → callers must not loop
//     faster than that (see TYPING_REFRESH_MS / editMessageText usage)

import { markdownToTelegramHtml } from './telegramFormat.ts';

const API_BASE = 'https://api.telegram.org';

export const TELEGRAM_MAX_MESSAGE_CHARS = 4096;
export const TELEGRAM_MAX_DOWNLOAD_BYTES = 20_000_000; // hard Bot API cap
export const TYPING_REFRESH_MS = 4_000; // "typing…" expires after ~5s

function botUrl(token: string, method: string): string {
  return `${API_BASE}/bot${token}/${method}`;
}

async function callApi(token: string, method: string, payload: unknown): Promise<any> {
  const res = await fetch(botUrl(token, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.ok) {
    // 429 carries parameters.retry_after — surfaced so callers can back off
    console.error(`[telegramApi] ${method} failed:`, JSON.stringify(json));
  }
  return json;
}

/**
 * Splits text on paragraph/line boundaries where possible so a long answer
 * doesn't get cut mid-sentence, falling back to a hard cut for text with no
 * breaks (e.g. one giant paragraph).
 */
export function splitForTelegram(text: string, limit = TELEGRAM_MAX_MESSAGE_CHARS): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let rest = text;

  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    // Prefer a paragraph break, then a line break, then a space
    let cut = window.lastIndexOf('\n\n');
    if (cut < limit * 0.5) cut = window.lastIndexOf('\n');
    if (cut < limit * 0.5) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = limit; // no usable boundary — hard cut

    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }

  if (rest.length > 0) chunks.push(rest);
  return chunks;
}

export interface InlineButton {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
}

export async function sendMessage(
  token: string,
  chatId: number | string,
  text: string,
  options: { buttons?: InlineButton[][]; replyToMessageId?: number } = {},
): Promise<void> {
  // Split on the raw Markdown with headroom below the 4096 cap: converting to
  // HTML adds tag overhead (<b>, <pre>, …) on top of the original length.
  const parts = splitForTelegram(text, 3500);
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const payload = {
      chat_id: chatId,
      // Buttons only on the final chunk, so they sit at the bottom of the answer
      ...(isLast && options.buttons ? { reply_markup: { inline_keyboard: options.buttons } } : {}),
      ...(i === 0 && options.replyToMessageId ? { reply_to_message_id: options.replyToMessageId } : {}),
    };

    const html = markdownToTelegramHtml(parts[i]);
    const result = await callApi(token, 'sendMessage', { ...payload, text: html, parse_mode: 'HTML' });

    // Malformed HTML (a Markdown edge case our converter didn't anticipate)
    // must never eat the answer — fall back to the plain, unconverted text.
    if (!result?.ok) {
      await callApi(token, 'sendMessage', { ...payload, text: parts[i] });
    }
  }
}

export async function sendChatAction(token: string, chatId: number | string, action = 'typing'): Promise<void> {
  await callApi(token, 'sendChatAction', { chat_id: chatId, action });
}

/**
 * Answering is mandatory: until the bot answers, Telegram clients keep a
 * loading spinner on the tapped button for up to a minute.
 */
export async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string): Promise<void> {
  await callApi(token, 'answerCallbackQuery', { callback_query_id: callbackQueryId, ...(text ? { text } : {}) });
}

export async function editMessageText(
  token: string,
  chatId: number | string,
  messageId: number,
  text: string,
  buttons?: InlineButton[][],
): Promise<void> {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  };
  const raw = text.slice(0, 3500);
  const result = await callApi(token, 'editMessageText', {
    ...payload,
    text: markdownToTelegramHtml(raw),
    parse_mode: 'HTML',
  });
  if (!result?.ok) {
    await callApi(token, 'editMessageText', { ...payload, text: raw });
  }
}

/**
 * Resolves a file_id to its bytes. Returns null when the file is missing or
 * larger than the Bot API allows us to fetch.
 */
export async function downloadFile(token: string, fileId: string): Promise<ArrayBuffer | null> {
  const info = await callApi(token, 'getFile', { file_id: fileId });
  const filePath = info?.result?.file_path;
  const fileSize = Number(info?.result?.file_size ?? 0);
  if (!filePath) return null;
  if (fileSize > TELEGRAM_MAX_DOWNLOAD_BYTES) {
    console.warn(`[telegramApi] file too large: ${fileSize} bytes`);
    return null;
  }

  const res = await fetch(`${API_BASE}/file/bot${token}/${filePath}`);
  if (!res.ok) {
    console.error('[telegramApi] file download failed:', res.status);
    return null;
  }
  return await res.arrayBuffer();
}

/** Registers the slash commands shown in Telegram's "/" menu. */
export async function setMyCommands(token: string, commands: { command: string; description: string }[]): Promise<void> {
  await callApi(token, 'setMyCommands', { commands });
}

/**
 * Sets the persistent button next to the message input for one chat (per
 * `chat_id`, so it can carry per-user text — unlike the native chat header,
 * which Telegram renders and no Bot API method can touch).
 *
 * Used to keep a live-ish token balance visible without the user having to
 * run /tokens: call this again whenever the balance changes. Text is capped
 * at 64 chars by Telegram.
 */
export async function setChatMenuButton(
  token: string,
  chatId: number | string,
  text: string,
  webAppUrl: string,
): Promise<void> {
  await callApi(token, 'setChatMenuButton', {
    chat_id: chatId,
    menu_button: { type: 'web_app', text: text.slice(0, 64), web_app: { url: webAppUrl } },
  });
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // chunked to avoid blowing the call stack on big files
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}
