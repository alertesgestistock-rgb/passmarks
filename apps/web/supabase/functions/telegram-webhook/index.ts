import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import {
  answerCallbackQuery,
  arrayBufferToBase64,
  downloadFile,
  InlineButton,
  sendChatAction,
  sendMessage,
  TYPING_REFRESH_MS,
} from '../_shared/telegramApi.ts';
import { PDF_MAX_PAGES, pdfToJpegPages } from '../_shared/pdfToImages.ts';
import { askTutor, TutorMessage } from '../_shared/aiTutor.ts';

// PassMark's Telegram bot: lets a linked student use the same AI tutor and the
// same token wallet straight from a Telegram chat, without opening the Mini App.
//
// Telegram delivers every update here. Anyone can POST to a public URL, so the
// secret token set via setWebhook is checked first — without it, a forged
// update could impersonate a linked telegram_id and spend that student's
// tokens. https://core.telegram.org/bots/api#setwebhook

const MINI_APP_URL = Deno.env.get('TELEGRAM_MINI_APP_URL') ?? 'https://passmarks.vercel.app';
const HISTORY_PAGE_SIZE = 5;
const CONTEXT_MESSAGE_LIMIT = 10; // past turns replayed to the model

// ── User-facing copy (English only — PassMark's UI language) ────────────────
const COPY = {
  welcome:
    'Welcome to PassMark 👋\n\n' +
    "I'm your GCE AI tutor. Send me any O Level or A Level question — as text, a photo of a past paper, or a PDF — and I'll solve it step by step.\n\n" +
    'To get started, open the app and sign in. Your questions and tokens are shared between the app and this chat.',
  notLinked:
    'You need a PassMark account before we can start.\n\n' +
    'Tap the button below to open the app and sign in with Telegram — it takes a few seconds, then come back here and ask me anything.',
  newConversation: 'Started a new conversation ✍️\n\nSend me your question whenever you are ready.',
  noConversations: "You don't have any conversations yet. Just send me a question to start one.",
  historyHeader: 'Your recent conversations — tap one to continue it:',
  switched: 'Switched conversation ✓ Send your next question.',
  openApp: 'Tap below to open PassMark 👇',
  outOfTokens:
    "You've run out of tokens. Open the app to top up, then come back and continue right here.",
  rateLimited: 'You are sending questions very fast. Please wait a moment and try again.',
  aiError: 'Something went wrong while answering. Please try again in a few seconds.',
  fileTooLarge: 'That file is too large for me to read. Try sending a photo of the specific question instead 📷',
  pdfTooManyPages: `That PDF has too many pages — I can read up to ${PDF_MAX_PAGES}. Send a photo of the question you're stuck on 📷`,
  pdfFailed: "I couldn't read that PDF. Try sending it again, or send a photo of the question 📷",
  unsupported: 'I can read text, photos and PDF files. Send me a GCE question in one of those formats 📚',
};

function openAppButton(): InlineButton[][] {
  return [[{ text: 'Open PassMark', web_app: { url: MINI_APP_URL } }]];
}

function tokenShopButton(): InlineButton[][] {
  // ?screen=tokens is read by Dashboard.jsx on mount to open the token shop
  // modal directly, instead of landing on the home tab first.
  return [[{ text: '💳 Buy tokens', web_app: { url: `${MINI_APP_URL}?screen=tokens` } }]];
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!botToken || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error('[telegram-webhook] Missing secrets.');
    return new Response('Server not configured', { status: 500 });
  }

  // Proof the update really came from Telegram — see header note above.
  if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== webhookSecret) {
    console.warn('[telegram-webhook] Rejected update with bad secret token.');
    return new Response('Forbidden', { status: 403 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Telegram retries an update it doesn't get a prompt 200 for, which would
  // double-charge a student for one question. Acknowledge immediately and keep
  // working in the background instead.
  const work = handleUpdate(supabase, botToken, update).catch((err) =>
    console.error('[telegram-webhook] handler failed:', err),
  );
  // @ts-ignore — EdgeRuntime is provided by the Supabase Edge Functions runtime
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
  else await work;

  return new Response('ok', { status: 200 });
});

async function handleUpdate(supabase: any, botToken: string, update: any): Promise<void> {
  if (update.callback_query) return handleCallbackQuery(supabase, botToken, update.callback_query);
  if (update.message) return handleMessage(supabase, botToken, update.message);
}

/** Finds the PassMark profile linked to this Telegram user, if any. */
async function findProfile(supabase: any, telegramId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, telegram_active_conversation_id')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  return data ?? null;
}

async function handleCallbackQuery(supabase: any, botToken: string, query: any): Promise<void> {
  const chatId = query.message?.chat?.id;
  const data: string = query.data ?? '';
  const telegramId = String(query.from?.id ?? '');

  // Always answer, or the client spins on the tapped button for up to a minute.
  await answerCallbackQuery(botToken, query.id);
  if (!chatId) return;

  const profile = await findProfile(supabase, telegramId);
  if (!profile) {
    await sendMessage(botToken, chatId, COPY.notLinked, { buttons: openAppButton() });
    return;
  }

  if (data.startsWith('conv:')) {
    const conversationId = data.slice('conv:'.length);
    // Scoped to this user's own conversations — a forged callback can't attach
    // someone else's conversation to this profile.
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, title')
      .eq('id', conversationId)
      .eq('user_id', profile.id)
      .maybeSingle();
    if (!conv) return;

    await supabase.from('profiles').update({ telegram_active_conversation_id: conv.id }).eq('id', profile.id);
    await sendMessage(botToken, chatId, `${COPY.switched}\n\n📁 ${conv.title ?? 'Conversation'}`);
    return;
  }

  if (data.startsWith('hpage:')) {
    const page = Number(data.slice('hpage:'.length)) || 0;
    await sendHistory(supabase, botToken, chatId, profile.id, page);
  }
}

async function handleMessage(supabase: any, botToken: string, message: any): Promise<void> {
  const chatId = message.chat?.id;
  const telegramId = String(message.from?.id ?? '');
  if (!chatId || !telegramId) return;

  const text: string = message.text ?? message.caption ?? '';
  const command = text.startsWith('/') ? text.split(/[\s@]/)[0].toLowerCase() : null;

  const profile = await findProfile(supabase, telegramId);

  if (command === '/start') {
    await sendMessage(botToken, chatId, COPY.welcome, { buttons: openAppButton() });
    return;
  }

  if (!profile) {
    await sendMessage(botToken, chatId, COPY.notLinked, { buttons: openAppButton() });
    return;
  }

  if (command === '/new') {
    await supabase.from('profiles').update({ telegram_active_conversation_id: null }).eq('id', profile.id);
    await sendMessage(botToken, chatId, COPY.newConversation);
    return;
  }

  if (command === '/history') {
    await sendHistory(supabase, botToken, chatId, profile.id, 0);
    return;
  }

  if (command === '/app') {
    await sendMessage(botToken, chatId, COPY.openApp, { buttons: openAppButton() });
    return;
  }

  if (command === '/tokens') {
    const { data: wallet } = await supabase
      .from('token_wallets')
      .select('balance')
      .eq('user_id', profile.id)
      .maybeSingle();
    const balance = wallet?.balance ?? 0;
    await sendMessage(
      botToken, chatId,
      `You have **${balance}** token${balance === 1 ? '' : 's'} left.`,
      { buttons: tokenShopButton() },
    );
    return;
  }

  // ── Build the question: text, photo, or PDF ───────────────────────────────
  const contentParts: any[] = [];

  if (message.photo?.length) {
    // Telegram sends several sizes; the last entry is the largest.
    const largest = message.photo[message.photo.length - 1];
    const bytes = await downloadFile(botToken, largest.file_id);
    if (!bytes) {
      await sendMessage(botToken, chatId, COPY.fileTooLarge);
      return;
    }
    contentParts.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: arrayBufferToBase64(bytes) },
    });
  } else if (message.document) {
    const mime: string = message.document.mime_type ?? '';
    if (!mime.includes('pdf')) {
      await sendMessage(botToken, chatId, COPY.unsupported);
      return;
    }
    await sendChatAction(botToken, chatId);
    const bytes = await downloadFile(botToken, message.document.file_id);
    if (!bytes) {
      await sendMessage(botToken, chatId, COPY.fileTooLarge);
      return;
    }
    const converted = await pdfToJpegPages(bytes);
    if (!converted.ok) {
      const reply =
        converted.reason === 'too_many_pages' ? COPY.pdfTooManyPages
        : converted.reason === 'too_large' ? COPY.fileTooLarge
        : COPY.pdfFailed;
      await sendMessage(botToken, chatId, reply);
      return;
    }
    for (const img of converted.images) {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } });
    }
  }

  const questionText = text.trim();
  if (!questionText && contentParts.length === 0) {
    await sendMessage(botToken, chatId, COPY.unsupported);
    return;
  }

  // A picture with no caption still needs an instruction for the model.
  const promptText = questionText || 'Solve this GCE question step by step.';
  contentParts.push({ type: 'text', text: promptText });

  await answerQuestion(supabase, botToken, chatId, profile, contentParts, promptText);
}

async function answerQuestion(
  supabase: any,
  botToken: string,
  chatId: number,
  profile: { id: string; telegram_active_conversation_id: string | null },
  contentParts: any[],
  storedUserText: string,
): Promise<void> {
  // Keep "typing…" alive while the model works (it expires after ~5s).
  await sendChatAction(botToken, chatId);
  const typing = setInterval(() => { sendChatAction(botToken, chatId).catch(() => {}); }, TYPING_REFRESH_MS);

  try {
    const conversationId = await getOrCreateConversation(supabase, profile, storedUserText);
    const history = await loadHistory(supabase, conversationId);

    const onlyText = contentParts.length === 1 && contentParts[0].type === 'text';
    const messages: TutorMessage[] = [
      ...history,
      { role: 'user', content: onlyText ? contentParts[0].text : contentParts },
    ];

    const result = await askTutor(supabase, profile.id, messages);

    if (!result.ok) {
      const reply =
        result.reason === 'insufficient_tokens' ? COPY.outOfTokens
        : result.reason === 'rate_limited' ? COPY.rateLimited
        : COPY.aiError;
      await sendMessage(
        botToken, chatId, reply,
        result.reason === 'insufficient_tokens' ? { buttons: openAppButton() } : {},
      );
      return;
    }

    // Persist both turns so the thread reads the same in the app and the bot.
    await supabase.from('messages').insert([
      { conversation_id: conversationId, role: 'user', content: storedUserText, content_type: 'text' },
      { conversation_id: conversationId, role: 'assistant', content: result.text, content_type: 'text' },
    ]);
    // Touch the row so /history keeps ordering by most recent activity. The
    // conversations_updated_at BEFORE UPDATE trigger sets the timestamp itself.
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

    await sendMessage(botToken, chatId, result.text);
  } finally {
    clearInterval(typing);
  }
}

async function getOrCreateConversation(
  supabase: any,
  profile: { id: string; telegram_active_conversation_id: string | null },
  firstText: string,
): Promise<string> {
  if (profile.telegram_active_conversation_id) {
    // Confirm it still exists and belongs to this user (it may have been
    // deleted from the web app since).
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', profile.telegram_active_conversation_id)
      .eq('user_id', profile.id)
      .maybeSingle();
    if (existing) return existing.id;
  }

  const title = (firstText || 'Telegram conversation').substring(0, 60);
  const { data: conv } = await supabase
    .from('conversations')
    .insert({ user_id: profile.id, title })
    .select('id')
    .single();

  await supabase.from('profiles').update({ telegram_active_conversation_id: conv.id }).eq('id', profile.id);
  profile.telegram_active_conversation_id = conv.id;
  return conv.id;
}

async function loadHistory(supabase: any, conversationId: string): Promise<TutorMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(CONTEXT_MESSAGE_LIMIT);

  if (!data) return [];
  // Fetched newest-first to get the most recent window, replayed oldest-first.
  return data
    .reverse()
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));
}

async function sendHistory(
  supabase: any,
  botToken: string,
  chatId: number,
  userId: string,
  page: number,
): Promise<void> {
  const from = page * HISTORY_PAGE_SIZE;
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE); // one extra row tells us if a next page exists

  if (!convs || convs.length === 0) {
    await sendMessage(botToken, chatId, page === 0 ? COPY.noConversations : COPY.historyHeader);
    return;
  }

  const hasNext = convs.length > HISTORY_PAGE_SIZE;
  const pageItems = hasNext ? convs.slice(0, HISTORY_PAGE_SIZE) : convs;

  const buttons: InlineButton[][] = pageItems.map((c: any) => [
    { text: `📁 ${(c.title ?? 'Conversation').substring(0, 40)}`, callback_data: `conv:${c.id}` },
  ]);

  const nav: InlineButton[] = [];
  if (page > 0) nav.push({ text: '◀ Previous', callback_data: `hpage:${page - 1}` });
  if (hasNext) nav.push({ text: 'Next ▶', callback_data: `hpage:${page + 1}` });
  if (nav.length) buttons.push(nav);

  await sendMessage(botToken, chatId, COPY.historyHeader, { buttons });
}
