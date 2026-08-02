import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getCorsHeaders } from "./cors.ts";
const TOPIC_SECRETS = {
  support: "TELEGRAM_TOPIC_SUPPORT",
  signups: "TELEGRAM_TOPIC_SIGNUPS",
  token_purchases: "TELEGRAM_TOPIC_TOKEN_PURCHASES",
  token_usage: "TELEGRAM_TOPIC_TOKEN_USAGE",
  daily_summary: "TELEGRAM_TOPIC_DAILY_SUMMARY",
  alerts: "TELEGRAM_TOPIC_ALERTS",
} as const;

type TelegramCategory = keyof typeof TOPIC_SECRETS;

// Relais interne : reçoit un texte déjà formaté et le pousse dans le
// groupe/chat Telegram configuré. Appelé soit par d'autres Edge Functions
// (submit-message) — jamais directement par le navigateur

serve(async (req) => {
  const dynamicCors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: dynamicCors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // SÉCURITÉ CRITIQUE : seul un appelant muni de la Service Role Key
    // (autre Edge Function ou trigger DB via pg_net) peut déclencher l'envoi.
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      console.warn("[notify-telegram] Bloqué : tentative d'accès externe non autorisée.");
      return new Response(JSON.stringify({ error: "Forbidden: Internal use only." }), {
        headers: { ...dynamicCors, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const legacyChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    const adminChatId = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

    if (!botToken || (!legacyChatId && !adminChatId)) {
      console.error("[notify-telegram] Secrets Telegram manquants.");
      return new Response(JSON.stringify({ error: "Configuration Telegram manquante." }), {
        headers: { ...dynamicCors, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const { text, category = "support", require_forum = false } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Champ 'text' requis." }), {
        headers: { ...dynamicCors, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!(category in TOPIC_SECRETS)) {
      return new Response(JSON.stringify({ error: "Catégorie Telegram inconnue." }), {
        headers: { ...dynamicCors, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const topicSecret = TOPIC_SECRETS[category as TelegramCategory];
    const topicId = Deno.env.get(topicSecret);
    const topicIsValid = Boolean(
      topicId && /^\d+$/.test(topicId) && Number(topicId) > 0,
    );
    const useForumTopic = Boolean(adminChatId && topicIsValid);
    const chatId = useForumTopic ? adminChatId : legacyChatId;

    if (require_forum && !useForumTopic) {
      return new Response(JSON.stringify({
        error: `Sujet Telegram non configuré : TELEGRAM_ADMIN_CHAT_ID / ${topicSecret}.`,
      }), {
        headers: { ...dynamicCors, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!chatId) {
      return new Response(JSON.stringify({
        error: `Routage incomplet : ${topicSecret} ou TELEGRAM_CHAT_ID requis.`,
      }), {
        headers: { ...dynamicCors, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        ...(useForumTopic ? { message_thread_id: Number(topicId) } : {}),
        text: text.slice(0, 4000), // limite Telegram ~4096 caractères
        disable_web_page_preview: true,
      }),
    });

    const telegramData = await telegramRes.json();

    if (!telegramRes.ok || !telegramData.ok) {
      console.error("[notify-telegram] Erreur API Telegram:", telegramData);
      return new Response(JSON.stringify({ error: telegramData.description || "Échec envoi Telegram." }), {
        headers: { ...dynamicCors, "Content-Type": "application/json" },
        status: 502,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      route: useForumTopic ? "forum_topic" : "legacy_chat",
      category,
    }), {
      headers: { ...dynamicCors, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[notify-telegram] Erreur critique:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...dynamicCors, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
