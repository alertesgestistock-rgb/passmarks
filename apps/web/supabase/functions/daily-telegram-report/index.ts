import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const REPORT_TIME_ZONE = "Africa/Douala";
const REPORT_CATEGORIES = [
  "signups",
  "token_purchases",
  "token_usage",
  "daily_summary",
] as const;

type ReportCategory = typeof REPORT_CATEGORIES[number];

const GENERATION_LABELS: Record<string, string> = {
  message: "💬 Messages IA",
  tag_question: "🏷️ Questions taguées",
  image: "🖼️ Génération d'images",
  pdf: "📄 Conversion PDF",
  mock_exam: "📝 Examens blancs",
  report: "📊 Rapports",
  quiz: "❓ Quiz",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const formatNumber = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(value);

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Non renseigné";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: REPORT_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

const currentReportDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const validDate = (value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const dayBounds = (date: string) => {
  // Cameroon stays on UTC+1 throughout the year.
  const start = new Date(`${date}T00:00:00+01:00`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid report date.");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
};

const splitMessage = (text: string, maxLength = 3600) => {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current && current.length + line.length + 1 > maxLength) {
      chunks.push(current);
      current = "";
    }
    if (line.length > maxLength) {
      if (current) chunks.push(current);
      for (let offset = 0; offset < line.length; offset += maxLength) {
        chunks.push(line.slice(offset, offset + maxLength));
      }
      current = "";
    } else {
      current += `${current ? "\n" : ""}${line}`;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

async function callTelegram(
  supabaseUrl: string,
  serviceRoleKey: string,
  category: string,
  text: string,
) {
  const chunks = splitMessage(text);
  for (let index = 0; index < chunks.length; index += 1) {
    const suffix = chunks.length > 1 ? `\n\nPartie ${index + 1}/${chunks.length}` : "";
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-telegram`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category,
        require_forum: true,
        text: `${chunks[index]}${suffix}`,
      }),
    });
    if (!response.ok) {
      throw new Error(`notify-telegram returned ${response.status}: ${await response.text()}`);
    }
  }
  return chunks.length;
}

async function listAllAuthUsers(admin: ReturnType<typeof createClient>) {
  const users = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return users;
}

const displayName = (
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  profiles: Map<string, Record<string, unknown>>,
) => {
  const profile = profiles.get(user.id);
  return String(
    profile?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Nom non renseigné"
  );
};

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const reportSecret = Deno.env.get("DAILY_REPORT_SECRET") ?? "";
    const bearer = req.headers.get("Authorization") ?? "";
    const suppliedSecret = req.headers.get("x-report-secret") ?? "";
    const isServiceCall = Boolean(serviceRoleKey && bearer === `Bearer ${serviceRoleKey}`);
    const isScheduledCall = Boolean(reportSecret && suppliedSecret === reportSecret);

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase server configuration is missing.");
    }
    if (!isServiceCall && !isScheduledCall) {
      return json({ error: "Forbidden: internal use only." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const reportDate = validDate(body.date) ? body.date : currentReportDate();
    const dryRun = body.dry_run === true;
    const force = body.force === true;

    if (body.test_category) {
      const testCategory = String(body.test_category);
      if (![...REPORT_CATEGORIES, "support", "alerts"].includes(testCategory)) {
        return json({ error: "Unknown test category." }, 400);
      }
      const testText = [
        "✅ Test du routage Telegram PassMark",
        `Catégorie : ${testCategory}`,
        `Date : ${formatDateTime(new Date().toISOString())}`,
        "",
        "Le bot peut publier dans le groupe privé et cibler ce sujet.",
      ].join("\n");
      if (dryRun) return json({ success: true, dry_run: true, text: testText });
      const messageCount = await callTelegram(
        supabaseUrl,
        serviceRoleKey,
        testCategory,
        testText,
      );
      return json({ success: true, test_category: testCategory, message_count: messageCount });
    }

    const { start, end } = dayBounds(reportDate);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [
      authUsers,
      profilesResult,
      tokenPurchasesResult,
      tokenUsageResult,
    ] = await Promise.all([
      listAllAuthUsers(admin),
      admin.from("profiles")
        .select("id, name, phone, created_at"),
      admin.from("token_purchases")
        .select("id, user_id, tokens_granted, amount_paid, payment_method, confirmed_at, status")
        .eq("status", "confirmed")
        .gte("confirmed_at", start)
        .lt("confirmed_at", end)
        .order("confirmed_at", { ascending: true }),
      admin.from("token_transactions")
        .select("id, user_id, amount, action_type, created_at")
        .in("action_type", Object.keys(GENERATION_LABELS))
        .lt("amount", 0)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: true }),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (tokenPurchasesResult.error) throw tokenPurchasesResult.error;
    if (tokenUsageResult.error) throw tokenUsageResult.error;

    const profiles = new Map(
      (profilesResult.data ?? []).map(profile => [profile.id, profile]),
    );
    const users = new Map(authUsers.map(user => [user.id, user]));
    const signups = authUsers
      .filter(user => user.created_at >= start && user.created_at < end)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const tokenPurchases = tokenPurchasesResult.data ?? [];
    const tokenUsage = tokenUsageResult.data ?? [];

    const signupLines = signups.flatMap((user, index) => {
      const profile = profiles.get(user.id);
      return [
        "",
        `${index + 1}. ${displayName(user, profiles)}`,
        `📧 ${user.email || "E-mail non renseigné"}`,
        `📱 ${profile?.phone || "Téléphone non renseigné"}`,
        `🕐 Inscription : ${formatDateTime(user.created_at)}`,
      ];
    });
    const signupsText = [
      `👥 INSCRIPTIONS DU ${reportDate}`,
      "",
      `Total : ${signups.length}`,
      ...signupLines,
    ].join("\n");

    const tokenPurchaseTotal = tokenPurchases.reduce(
      (sum, purchase) => sum + Number(purchase.tokens_granted || 0),
      0,
    );
    const tokenRevenue = tokenPurchases.reduce(
      (sum, purchase) => sum + Number(purchase.amount_paid || 0),
      0,
    );
    const tokenPurchaseLines = tokenPurchases.flatMap((purchase, index) => {
      const user = users.get(purchase.user_id);
      return [
        "",
        `${index + 1}. ${user ? displayName(user, profiles) : "Utilisateur inconnu"}`,
        `📧 ${user?.email || "E-mail non renseigné"}`,
        `🪙 ${formatNumber(Number(purchase.tokens_granted || 0))} tokens`,
        `💰 ${formatNumber(Number(purchase.amount_paid || 0))} FCFA`,
        `💳 ${purchase.payment_method || "Méthode non renseignée"}`,
        `🕐 ${formatDateTime(purchase.confirmed_at)}`,
      ];
    });
    const tokenPurchasesText = [
      `🪙 ACHATS DE TOKENS DU ${reportDate}`,
      "",
      `Achats confirmés : ${tokenPurchases.length}`,
      `Tokens vendus : ${formatNumber(tokenPurchaseTotal)}`,
      `Revenu : ${formatNumber(tokenRevenue)} FCFA`,
      ...tokenPurchaseLines,
    ].join("\n");

    const usageByAction = new Map<string, number>();
    const usageByUser = new Map<string, number>();
    let totalTokensUsed = 0;
    for (const transaction of tokenUsage) {
      const amount = Math.abs(Number(transaction.amount || 0));
      totalTokensUsed += amount;
      usageByAction.set(
        transaction.action_type,
        (usageByAction.get(transaction.action_type) ?? 0) + amount,
      );
      usageByUser.set(
        transaction.user_id,
        (usageByUser.get(transaction.user_id) ?? 0) + amount,
      );
    }
    const topUsers = [...usageByUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const tokenUsageText = [
      `🔥 UTILISATION DU ${reportDate}`,
      "",
      `Tokens consommés : ${formatNumber(totalTokensUsed)}`,
      `Utilisateurs actifs : ${usageByUser.size}`,
      `Générations facturées : ${tokenUsage.length}`,
      "",
      "Par fonctionnalité :",
      ...Object.entries(GENERATION_LABELS).map(
        ([action, label]) => `${label} : ${formatNumber(usageByAction.get(action) ?? 0)}`,
      ),
      "",
      "Plus gros utilisateurs :",
      ...(topUsers.length
        ? topUsers.map(([userId, amount], index) => {
            const user = users.get(userId);
            const name = user ? displayName(user, profiles) : "Utilisateur inconnu";
            return `${index + 1}. ${name} — ${formatNumber(amount)} tokens`;
          })
        : ["Aucune consommation."]),
    ].join("\n");

    const summaryText = [
      `📊 PASSMARK — RÉSUMÉ DU ${reportDate}`,
      "",
      `👥 Nouvelles inscriptions : ${signups.length}`,
      `🪙 Packs de tokens achetés : ${tokenPurchases.length}`,
      `💵 Revenus tokens : ${formatNumber(tokenRevenue)} FCFA`,
      `🔥 Tokens consommés : ${formatNumber(totalTokensUsed)}`,
      `🎓 Générations facturées : ${tokenUsage.length}`,
      `🧑‍💻 Utilisateurs actifs : ${usageByUser.size}`,
      "",
      `💰 Revenu total FCFA : ${formatNumber(tokenRevenue)}`,
    ].join("\n");

    const reports: Record<ReportCategory, string> = {
      signups: signupsText,
      token_purchases: tokenPurchasesText,
      token_usage: tokenUsageText,
      daily_summary: summaryText,
    };

    const metrics = {
      signups: signups.length,
      token_purchases: tokenPurchases.length,
      tokens_sold: tokenPurchaseTotal,
      token_revenue_fcfa: tokenRevenue,
      tokens_used: totalTokensUsed,
      active_users: usageByUser.size,
      generation_transactions: tokenUsage.length,
    };

    if (dryRun) {
      return json({ success: true, dry_run: true, report_date: reportDate, metrics, reports });
    }

    const results = [];
    for (const category of REPORT_CATEGORIES) {
      const { data: claimed, error: claimError } = await admin.rpc(
        "claim_daily_telegram_report",
        {
          p_report_date: reportDate,
          p_category: category,
          p_force: force,
        },
      );
      if (claimError) throw claimError;
      if (!claimed) {
        results.push({ category, status: "skipped_already_claimed" });
        continue;
      }

      const { error: payloadError } = await admin
        .from("daily_telegram_reports")
        .update({
          payload: metrics,
          updated_at: new Date().toISOString(),
        })
        .eq("report_date", reportDate)
        .eq("category", category);
      if (payloadError) throw payloadError;

      try {
        const messageCount = await callTelegram(
          supabaseUrl,
          serviceRoleKey,
          category,
          reports[category],
        );
        const { error: sentUpdateError } = await admin.from("daily_telegram_reports").update({
          status: "sent",
          message_count: messageCount,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("report_date", reportDate).eq("category", category);
        if (sentUpdateError) throw sentUpdateError;
        results.push({ category, status: "sent", message_count: messageCount });
      } catch (error) {
        const { error: failedUpdateError } = await admin.from("daily_telegram_reports").update({
          status: "failed",
          error: String(error?.message || error).slice(0, 2000),
          updated_at: new Date().toISOString(),
        }).eq("report_date", reportDate).eq("category", category);
        if (failedUpdateError) {
          console.error("[daily-telegram-report] Unable to record failure:", failedUpdateError);
        }
        results.push({ category, status: "failed", error: error?.message || String(error) });
      }
    }

    return json({ success: true, report_date: reportDate, metrics, results });
  } catch (error) {
    console.error("[daily-telegram-report] Unexpected error:", error);
    return json({ error: "Unable to build the daily Telegram report." }, 500);
  }
});

