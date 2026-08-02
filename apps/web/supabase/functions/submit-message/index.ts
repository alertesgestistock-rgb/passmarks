import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "./cors.ts";

const SOURCES = {
  header_feedback: "Feedback rapide (en-tête)",
  settings_feedback: "Suggestion (réglages)",
  settings_help: "Support (réglages)",
  whatsapp_support: "Support WhatsApp",
  public_contact: "Formulaire de contact public",
} as const;

type Source = keyof typeof SOURCES;

const SENTIMENTS = new Set(["love", "happy", "neutral", "sad", "angry"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status: number, headers: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

const clean = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

async function callInternalFunction(
  supabaseUrl: string,
  serviceRoleKey: string,
  functionName: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${functionName} returned ${response.status}: ${await response.text()}`);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase server configuration is missing.");
    }

    const payload = await req.json();
    const source = clean(payload.source, 64) as Source;
    if (!(source in SOURCES)) {
      return json({ error: "Unknown message source." }, 400, corsHeaders);
    }

    const message = clean(payload.message, 5000);
    const subject = clean(payload.subject, 200);
    const sentiment = clean(payload.sentiment, 20);
    const contextPage = clean(payload.context_page, 300);
    const requestedChannel = clean(payload.channel, 30);

    if (message.length < 3 && !sentiment) {
      return json({ error: "A message or sentiment is required." }, 400, corsHeaders);
    }
    if (sentiment && !SENTIMENTS.has(sentiment)) {
      return json({ error: "Invalid sentiment." }, 400, corsHeaders);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let authUser = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await admin.auth.getUser(token);
      authUser = data.user ?? null;
    }

    if (!authUser && source !== "public_contact") {
      return json({ error: "Authentication required." }, 401, corsHeaders);
    }

    let profile = null;
    if (authUser) {
      const { data, error } = await admin
        .from("profiles")
        .select("name, phone")
        .eq("id", authUser.id)
        .maybeSingle();
      if (error) throw error;
      profile = data;
    }

    const isPublicContact = source === "public_contact";
    const name = isPublicContact
      ? clean(payload.name, 150) || clean(profile?.name, 150)
      : clean(profile?.name, 150);
    const email = (isPublicContact
      ? clean(payload.email, 320) || clean(authUser?.email, 320)
      : clean(authUser?.email, 320)).toLowerCase();
    const phone = isPublicContact
      ? clean(payload.phone, 50) || clean(profile?.phone, 50)
      : clean(profile?.phone, 50);

    if (source === "public_contact") {
      if (!name || !EMAIL_PATTERN.test(email) || !subject || message.length < 10) {
        return json({ error: "Name, valid email, subject and a 10-character message are required." }, 400, corsHeaders);
      }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    let rateQuery = admin
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);
    rateQuery = authUser ? rateQuery.eq("user_id", authUser.id) : rateQuery.eq("email", email);

    const { count, error: rateError } = await rateQuery;
    if (rateError) throw rateError;
    if ((count ?? 0) >= 5) {
      return json({ error: "Too many messages. Please try again later." }, 429, corsHeaders);
    }

    const channel = source === "whatsapp_support"
      ? "whatsapp"
      : requestedChannel || "in_app";

    const { data: inserted, error: insertError } = await admin
      .from("support_messages")
      .insert({
        source,
        user_id: authUser?.id ?? null,
        name: name || null,
        email: email || null,
        phone: phone || null,
        subject: subject || null,
        message: message || null,
        sentiment: sentiment || null,
        context_page: contextPage || null,
        channel,
        metadata: { user_agent: clean(req.headers.get("user-agent"), 500) || null },
      })
      .select("id, created_at")
      .single();

    if (insertError) throw insertError;

    const telegramText = [
      "📨 Nouveau message PassMark",
      `Source : ${SOURCES[source]}`,
      `Date : ${new Date(inserted.created_at).toISOString()}`,
      `Nom : ${name || "Non renseigné"}`,
      `E-mail : ${email || "Non renseigné"}`,
      `Téléphone : ${phone || "Non renseigné"}`,
      subject ? `Sujet : ${subject}` : null,
      sentiment ? `Sentiment : ${sentiment}` : null,
      contextPage ? `Page : ${contextPage}` : null,
      `Canal : ${channel}`,
      "",
      message || "(aucun texte)",
      "",
      `ID : ${inserted.id}`,
    ].filter(Boolean).join("\n");

    let telegramNotified = false;
    const notificationErrors: string[] = [];

    try {
      await callInternalFunction(supabaseUrl, serviceRoleKey, "notify-telegram", {
        text: telegramText,
        category: "support",
      });
      telegramNotified = true;
    } catch (error) {
      console.error("[submit-message] Telegram notification failed:", error);
      notificationErrors.push(`telegram: ${error.message}`);
    }

    const { error: updateError } = await admin
      .from("support_messages")
      .update({
        telegram_notified_at: telegramNotified ? new Date().toISOString() : null,
        notification_error: notificationErrors.length ? notificationErrors.join("\n").slice(0, 2000) : null,
      })
      .eq("id", inserted.id);
    if (updateError) console.error("[submit-message] Delivery status update failed:", updateError);

    return json({
      success: true,
      message_id: inserted.id,
      telegram_notified: telegramNotified,
    }, 200, corsHeaders);
  } catch (error) {
    console.error("[submit-message] Unexpected error:", error);
    return json({ error: "Unable to submit the message." }, 500, corsHeaders);
  }
});
