import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "./cors.ts";

// Logs in / signs up a Telegram Mini App user without a password, using the
// initData string Telegram signs and hands to the frontend on launch.
//
// Flow:
//   1. Verify initData's HMAC-SHA256 signature against our bot token
//      (proves it really came from Telegram, not a forged request).
//   2. Reject stale initData (replay protection).
//   3. Find or create a Supabase Auth user + profile row linked to this
//      Telegram id.
//   4. Issue a magic-link token via the Admin API and hand it back — the
//      frontend exchanges it for a real session with supabase.auth.verifyOtp.
//
// Reference (verified against official docs, 2026-09-08):
// https://docs.telegram-mini-apps.com/platform/init-data
// https://core.telegram.org/bots/webapps

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60; // 24h — no official Telegram figure, this is a conservative replay window

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyInitData(initData: string, botToken: string): Promise<{ ok: boolean; user?: any; authDate?: number }> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false };
  params.delete("hash");

  // data-check-string: remaining fields, "key=value", sorted, joined by \n
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // secret_key = HMAC_SHA256(bot_token, "WebAppData")
  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
  const computedHash = toHex(await hmacSha256(secretKey, dataCheckString));

  if (computedHash !== hash) return { ok: false };

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_INIT_DATA_AGE_SECONDS) {
    return { ok: false };
  }

  const userRaw = params.get("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  if (!user?.id) return { ok: false };

  return { ok: true, user, authDate };
}

serve(async (req) => {
  const dynamicCors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: dynamicCors });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!botToken || !supabaseUrl || !serviceKey) {
      console.error("[telegram-login] Secrets manquants (TELEGRAM_BOT_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
      return new Response(JSON.stringify({ error: "Configuration serveur manquante." }), {
        status: 500,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    const { initData, checkOnly, referralCode } = await req.json();
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

    const tgUser = verified.user; // { id, first_name, last_name?, username?, photo_url?, ... } — signed & trustworthy past this point
    const telegramId = String(tgUser.id);
    const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || tgUser.username || `Telegram ${telegramId}`;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // checkOnly: just report whether this Telegram id is already linked to an
    // account — never creates anything. Lets the frontend decide between
    // "silently sign this returning user in" vs "ask them first" (new
    // Telegram id => might be a brand new user, or an existing PassMark user
    // opening from Telegram for the first time — we must not guess).
    if (checkOnly) {
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegramId)
        .maybeSingle();
      return new Response(JSON.stringify({ linked: Boolean(existing) }), {
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    // Synthetic, stable, non-guessable-enough email used only as the Auth
    // identity key — never shown to the user, never used for real mail.
    const syntheticEmail = `tg-${telegramId}@telegram.passmark.internal`;

    // Find an existing profile already linked to this Telegram id.
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // No profile linked yet — create the Auth user (idempotent: if the
      // synthetic email already exists from a previous partial run, fetch it
      // instead of failing).
      // `name` matters here: the on_auth_user_created trigger (handle_new_user)
      // seeds public.profiles from raw_user_meta_data, so without it the profile
      // is created with an empty name and only fixed by the upsert below.
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          name: displayName,
          telegram_id: telegramId,
          telegram_username: tgUser.username ?? null,
          provider: "telegram",
        },
      });

      if (createErr) {
        if (!String(createErr.message).toLowerCase().includes("already")) {
          console.error("[telegram-login] createUser failed:", createErr);
          return new Response(JSON.stringify({ error: "Impossible de créer l'utilisateur." }), {
            status: 500,
            headers: { ...dynamicCors, "Content-Type": "application/json" },
          });
        }
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users?.find((u) => u.email === syntheticEmail);
        if (!found) throw createErr;
        userId = found.id;
      } else {
        userId = created.user.id;
      }

      // Link/create the profile row. `handle_new_profile_wallet` (existing DB
      // trigger, per UserContext.jsx) is expected to have already created a
      // bare profile row on auth.users insert — this just attaches the
      // Telegram identity and a starting display name.
      await admin
        .from("profiles")
        .upsert({ id: userId, telegram_id: telegramId, name: displayName }, { onConflict: "id" });

      // Referral, only for a genuinely NEW account (this whole branch only
      // runs when no profile was linked to this telegram_id yet) — never on
      // a returning user's login. apply_referral itself is idempotent and
      // guards self-referral / already-referred, so this can't double-credit
      // even on a retried request.
      if (typeof referralCode === "string" && /^[a-zA-Z0-9]{6}$/.test(referralCode)) {
        const { error: referralErr } = await admin.rpc("apply_referral", {
          p_code: referralCode,
          p_referred_id: userId,
        });
        // Never fail the login over a bad/reused code — the account still
        // needs to be created either way.
        if (referralErr) console.warn("[telegram-login] apply_referral failed:", referralErr);
      }
    }

    // Issue a one-time login token via the Admin API (magic-link machinery,
    // but we never actually email it — we hand the hashed token straight
    // back over HTTPS and the frontend redeems it immediately).
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("[telegram-login] generateLink failed:", linkErr);
      return new Response(JSON.stringify({ error: "Impossible de générer la session." }), {
        status: 500,
        headers: { ...dynamicCors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        email: syntheticEmail,
        token_hash: linkData.properties.hashed_token,
      }),
      { headers: { ...dynamicCors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[telegram-login] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne." }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
