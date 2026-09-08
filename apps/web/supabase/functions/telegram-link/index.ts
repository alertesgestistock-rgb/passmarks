import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "./cors.ts";

// Links a Telegram identity to the user who is CURRENTLY signed in (via the
// request's own Authorization JWT) — used when someone opens PassMark from
// Telegram, says "I already have an account", signs in/up normally, and we
// then attach their telegram_id so future Telegram opens recognize them
// automatically instead of creating a duplicate ("ghost") account.
//
// Same initData verification as telegram-login — see that function for the
// algorithm reference and sources.

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyInitData(initData: string, botToken: string): Promise<{ ok: boolean; user?: any }> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false };
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
  const computedHash = toHex(await hmacSha256(secretKey, dataCheckString));
  if (computedHash !== hash) return { ok: false };

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_INIT_DATA_AGE_SECONDS) return { ok: false };

  const userRaw = params.get("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  if (!user?.id) return { ok: false };
  return { ok: true, user };
}

serve(async (req) => {
  const dynamicCors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: dynamicCors });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!botToken || !supabaseUrl || !anonKey || !serviceKey) {
      console.error("[telegram-link] Secrets manquants.");
      return new Response(JSON.stringify({ error: "Configuration serveur manquante." }), {
        status: 500,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié." }), {
        status: 401,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    // Identify the caller from THEIR OWN session token — never trust a
    // user id passed in the request body.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Session invalide." }), {
        status: 401,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const { initData } = await req.json();
    if (!initData || typeof initData !== "string") {
      return new Response(JSON.stringify({ error: "Champ 'initData' requis." }), {
        status: 400,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const verified = await verifyInitData(initData, botToken);
    if (!verified.ok || !verified.user) {
      return new Response(JSON.stringify({ error: "initData invalide ou expiré." }), {
        status: 401,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const telegramId = String(verified.user.id);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Refuse if this Telegram id is already linked to a DIFFERENT account
    // (e.g. someone switching Telegram accounts) — surface a clear error
    // rather than silently stealing the link.
    const { data: existingLink } = await admin
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (existingLink && existingLink.id !== caller.id) {
      return new Response(JSON.stringify({ error: "Ce compte Telegram est déjà lié à un autre profil PassMark." }), {
        status: 409,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await admin
      .from("profiles")
      .update({ telegram_id: telegramId })
      .eq("id", caller.id);

    if (updateErr) {
      console.error("[telegram-link] update failed:", updateErr);
      return new Response(JSON.stringify({ error: "Impossible de lier le compte Telegram." }), {
        status: 500,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...dynamicCors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[telegram-link] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne." }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
