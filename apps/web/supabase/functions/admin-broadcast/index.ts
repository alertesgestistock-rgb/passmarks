import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "./cors.ts";
import { sendMessage } from "../_shared/telegramApi.ts";

// Admin-only: writes a targeted notification (see
// supabase/migrations/20260910170000_021_admin_broadcast_notifications.sql
// for the filter shape) into public.notifications for every matching user,
// and optionally relays the same text as a real Telegram message to whoever
// among them has a linked account.
//
// The DB write and the admin check both happen inside
// admin_broadcast_notification() (SECURITY DEFINER + internal is_admin()
// guard) — this function calls it with the CALLER'S OWN JWT (anon key +
// forwarded Authorization header), never the service role, so a non-admin
// hitting this endpoint gets the same "not_admin" rejection Postgres would
// give directly. Service role is only used for the Telegram bot token secret,
// which stays server-side.
//
// Called from the browser (AdminBroadcastTab.jsx) with the admin's own
// session — JWT verification stays ON (no --no-verify-jwt).

serve(async (req) => {
  const dynamicCors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: dynamicCors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!supabaseUrl || !anonKey) {
      console.error("[admin-broadcast] Missing SUPABASE_URL/SUPABASE_ANON_KEY.");
      return new Response(JSON.stringify({ error: "Server configuration missing." }), {
        status: 500,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const { title, body, filters, sendTelegram, links } = await req.json();
    if (!title || typeof title !== "string" || !body || typeof body !== "string") {
      return new Response(JSON.stringify({ error: "'title' and 'body' are required." }), {
        status: 400,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }
    // links: [{ label: string, url: string }, ...] — as many as the admin added.
    const linkButtons: { label: string; url: string }[] = Array.isArray(links)
      ? links.filter((l) => l?.url && typeof l.url === "string")
      : [];

    // Runs as the caller — admin_broadcast_notification() does its own
    // is_admin(auth.uid()) check and raises if the caller isn't one.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: result, error: rpcError } = await callerClient.rpc("admin_broadcast_notification", {
      p_title: title,
      p_body: body,
      p_filters: filters || {},
      p_send_telegram: Boolean(sendTelegram),
      p_links: linkButtons,
    });

    if (rpcError) {
      const status = rpcError.message?.includes("not_admin") ? 403 : 400;
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const telegramIds: string[] = Array.isArray(result?.telegram_ids) ? result.telegram_ids : [];
    let telegramSentCount = 0;

    if (sendTelegram && telegramIds.length > 0) {
      if (!botToken) {
        console.warn("[admin-broadcast] sendTelegram requested but TELEGRAM_BOT_TOKEN is missing — skipping Telegram delivery.");
      } else {
        const text = `📣 ${title}\n\n${body}`;
        // Each link becomes its own inline-keyboard row (its own label,
        // stacked vertically) rather than pasted into the text — mirrors how
        // the bot already renders multiple choices (see /history).
        const buttons = linkButtons.length
          ? linkButtons.map((l) => [{ text: l.label?.trim() || "🔗 Open link", url: l.url }])
          : undefined;
        // Sequential with a small delay: Telegram allows ~30 msg/s overall,
        // ~1/s per chat — a broadcast to a few dozen users stays well under
        // that without needing real batching/backoff logic.
        for (const chatId of telegramIds) {
          try {
            await sendMessage(botToken, chatId, text, { buttons });
            telegramSentCount++;
          } catch (err) {
            console.error(`[admin-broadcast] Telegram send failed for ${chatId}:`, err);
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        if (result?.broadcast_id) {
          await callerClient.rpc("admin_update_broadcast_telegram_count", {
            p_broadcast_id: result.broadcast_id,
            p_sent_count: telegramSentCount,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      recipient_count: result?.recipient_count ?? 0,
      telegram_sent_count: telegramSentCount,
    }), {
      headers: { ...dynamicCors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[admin-broadcast] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error." }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
