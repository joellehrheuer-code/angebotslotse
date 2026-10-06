import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const NEWSLETTER_FROM_EMAIL = Deno.env.get("NEWSLETTER_FROM_EMAIL") || "";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ALLOWED_ORIGINS = new Set([
  "https://joellehrheuer-code.github.io",
  "http://localhost:4173",
  "http://localhost:3000",
]);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Resource-Policy": "same-site",
  "Cache-Control": "no-store",
};
const cors = (origin = "") => ({
  ...SECURITY_HEADERS,
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://joellehrheuer-code.github.io",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Vary": "Origin",
});

const json = (body: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; script-src 'none'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    },
  });

const clean = (value: unknown, max = 1000) =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const normalizeEmail = (value: unknown) => clean(value, 254).toLowerCase();
const httpsUrl = (value: unknown, max = 1200) => {
  const candidate = clean(value, max);
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString().slice(0, max) : "";
  } catch {
    return "";
  }
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const REPORT_TYPES = new Set(["broken_link","wrong_price","missing_image","outdated","ui_bug","newsletter","other"]);

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sendNewsletterConfirmation(emailAddress: string, confirmToken: string, unsubscribeToken: string) {
  if (!RESEND_API_KEY || !NEWSLETTER_FROM_EMAIL) {
    return { ok: false, error: "email_not_configured" };
  }

  const confirmUrl = `${SUPABASE_URL}/functions/v1/public-intake?confirm=${encodeURIComponent(confirmToken)}`;
  const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/public-intake?unsubscribe=${encodeURIComponent(unsubscribeToken)}`;
  const safeConfirm = escapeHtml(confirmUrl);
  const safeUnsubscribe = escapeHtml(unsubscribeUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: NEWSLETTER_FROM_EMAIL,
      to: [emailAddress],
      subject: "Bitte bestätige deine Angebotslotse-Newsletter-Anmeldung",
      text:
        "Fast geschafft. Bitte bestätige deine Newsletter-Anmeldung:\n\n" +
        confirmUrl +
        "\n\nFalls du dich nicht angemeldet hast, kannst du diese Nachricht ignorieren. Abmelden: " +
        unsubscribeUrl,
      html:
        '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111827">' +
        '<h1 style="font-size:26px">Newsletter-Anmeldung bestätigen</h1>' +
        '<p>Fast geschafft. Klicke auf den Button, um deine Anmeldung beim Angebotslotse zu bestätigen.</p>' +
        '<p><a href="' + safeConfirm + '" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700">E-Mail bestätigen</a></p>' +
        '<p style="font-size:13px;color:#6b7280">Falls du dich nicht angemeldet hast, kannst du diese Nachricht ignorieren.</p>' +
        '<p style="font-size:12px;color:#6b7280"><a href="' + safeUnsubscribe + '">Abmelden</a></p>' +
        '</div>',
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("Resend confirmation email failed", response.status, detail);
    return { ok: false, error: "confirmation_email_failed" };
  }
  return { ok: true };
}

async function rateLimit(req: Request, kind: string, origin: string) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
  const ua = (req.headers.get("user-agent") || "").slice(0, 250);
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const key = await sha256(`${kind}|${bucket}|${forwarded}|${ua}`);
  const now = new Date().toISOString();
  const { data } = await admin.from("site_intake_rate").select("request_count,window_start").eq("key", key).maybeSingle();
  const limit = kind === "visit" ? 2 : kind === "review" ? 3 : kind === "report" ? 8 : kind === "partner" ? 3 : 5;
  if (data && Number(data.request_count) >= limit) {
    return json({ ok: false, error: "rate_limited" }, 429, origin);
  }
  if (data) {
    await admin.from("site_intake_rate").update({
      request_count: Number(data.request_count) + 1,
      updated_at: now,
    }).eq("key", key);
  } else {
    await admin.from("site_intake_rate").insert({
      key,
      window_start: now,
      request_count: 1,
      updated_at: now,
    });
  }
  return null;
}

async function communitySnapshot() {
  const [{ data: traffic }, { data: ratings }, { data: reviews }] = await Promise.all([
    admin.from("site_traffic").select("visits,started_at").eq("singleton", 1).maybeSingle(),
    admin.from("site_reviews").select("rating").eq("status", "approved").limit(1000),
    admin.from("site_reviews")
      .select("display_name,rating,comment,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const ratingValues = (ratings || [])
    .map(row => Number(row.rating))
    .filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
  const ratingAverage = ratingValues.length
    ? Math.round((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length) * 10) / 10
    : null;

  return {
    visits: Number(traffic?.visits || 0),
    visitsStartedAt: traffic?.started_at || null,
    reviewCount: ratingValues.length,
    ratingAverage,
    reviews: (reviews || []).map(row => ({
      name: clean(row.display_name, 60) || "Anonym",
      rating: Number(row.rating),
      comment: clean(row.comment, 600),
      createdAt: row.created_at,
    })),
  };
}

function resultPage(title: string, copy: string) {
  const safeTitle = title.replace(/[<>&]/g, "");
  const safeCopy = copy.replace(/[<>&]/g, "");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} – Angebotslotse</title>
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080b18;color:#f7f8ff;font:16px system-ui,Arial,sans-serif}.box{width:min(620px,calc(100% - 32px));padding:32px;border:1px solid #303858;border-radius:24px;background:#11162a;box-shadow:0 24px 70px #0008}h1{margin-top:0;font-size:34px}p{color:#b4bdd3;line-height:1.65}a{display:inline-block;margin-top:12px;padding:12px 16px;border-radius:12px;background:linear-gradient(90deg,#ff3fa8,#a969ff);color:white;text-decoration:none;font-weight:800}</style></head><body><main class="box"><h1>${safeTitle}</h1><p>${safeCopy}</p><a href="https://joellehrheuer-code.github.io/angebotslotse/">Zurück zum Angebotslotse</a></main></body></html>`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response("ok", { headers: cors(origin) });
  }

  if (req.method === "GET") {
    const confirm = clean(url.searchParams.get("confirm"), 100);
    const unsubscribe = clean(url.searchParams.get("unsubscribe"), 100);

    if (confirm) {
      const { data, error } = await admin.from("newsletter_subscribers")
        .select("id,status")
        .eq("confirm_token", confirm)
        .maybeSingle();
      if (error || !data) return html(resultPage("Link ungültig", "Dieser Bestätigungslink ist nicht gültig oder wurde bereits ersetzt."), 404);
      if (data.status !== "active") {
        await admin.from("newsletter_subscribers").update({
          status: "active",
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", data.id);
      }
      return html(resultPage("Newsletter bestätigt", "Deine Anmeldung ist bestätigt. Du kannst dich jederzeit über den Abmeldelink in unseren Newsletter-Mails wieder austragen."));
    }

    if (unsubscribe) {
      const { data, error } = await admin.from("newsletter_subscribers")
        .select("id")
        .eq("unsubscribe_token", unsubscribe)
        .maybeSingle();
      if (error || !data) return html(resultPage("Link ungültig", "Dieser Abmeldelink ist nicht gültig."), 404);
      await admin.from("newsletter_subscribers").update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", data.id);
      return html(resultPage("Newsletter abgemeldet", "Du erhältst über diesen Newsletter keine weiteren Nachrichten mehr."));
    }

    if (url.searchParams.get("community") === "1") {
      return json({ ok: true, ...(await communitySnapshot()) }, 200, origin);
    }

    return json({ ok: true, service: "angebotslotse-public-intake", version: 2 });
  }

  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "origin_not_allowed" }, 403, origin);

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 20000) return json({ ok: false, error: "payload_too_large" }, 413, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400, origin); }

  if (clean(body.website, 200)) return json({ ok: true }, 200, origin);

  const kind = clean(body.kind, 30);
  if (!["report","newsletter","partner","review","visit"].includes(kind)) return json({ ok: false, error: "invalid_kind" }, 400, origin);

  const limited = await rateLimit(req, kind, origin);
  if (limited) return limited;


  if (kind === "visit") {
    const { error } = await admin.rpc("increment_site_visit");
    if (error) {
      console.error("Visit increment failed", error.message);
      return json({ ok: false, error: "save_failed" }, 500, origin);
    }
    return json({ ok: true, ...(await communitySnapshot()) }, 200, origin);
  }

  if (kind === "review") {
    const displayName = clean(body.displayName, 60) || "Anonym";
    const rating = Number(body.rating);
    const comment = clean(body.comment, 600);
    const source = clean(body.source, 80) || "website";

    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3) {
      return json({ ok: false, error: "invalid_review_input" }, 400, origin);
    }
    if ((comment.match(/https?:\/\//gi) || []).length > 1) {
      return json({ ok: false, error: "invalid_review_input" }, 400, origin);
    }

    const normalizedComment = comment.toLowerCase().replace(/\s+/g, " ").slice(0, 500);
    const fingerprint = await sha256(`${rating}|${displayName.toLowerCase()}|${normalizedComment}`);

    const { data: existing } = await admin.from("site_reviews")
      .select("id,status")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (existing) {
      return json({ ok: true, state: existing.status === "approved" ? "already_approved" : "already_submitted" }, 200, origin);
    }

    const { error } = await admin.from("site_reviews").insert({
      display_name: displayName,
      rating,
      comment,
      status: "pending",
      source,
      fingerprint,
    });
    if (error) {
      console.error("Review save failed", error.message);
      return json({ ok: false, error: "save_failed" }, 500, origin);
    }

    return json({ ok: true, state: "pending_moderation" }, 201, origin);
  }

  if (kind === "partner") {
    const companyName = clean(body.companyName, 180);
    const contactName = clean(body.contactName, 120);
    const contactEmail = normalizeEmail(body.email);
    const websiteInput = clean(body.websiteUrl, 1200);
    const websiteUrl = httpsUrl(websiteInput);
    const network = clean(body.network, 100);
    const programInput = clean(body.programUrl, 1200);
    const programUrl = httpsUrl(programInput);
    const feedInput = clean(body.feedUrl, 1200);
    const feedUrl = httpsUrl(feedInput);
    const categories = clean(body.categories, 500);
    const message = clean(body.message, 2500);
    const source = clean(body.source, 80) || "website";

    if (companyName.length < 2 || !EMAIL_RE.test(contactEmail) || !websiteUrl) {
      return json({ ok: false, error: "invalid_partner_input" }, 400, origin);
    }
    if ((programInput && !programUrl) || (feedInput && !feedUrl)) {
      return json({ ok: false, error: "invalid_partner_url" }, 400, origin);
    }

    const websiteHost = new URL(websiteUrl).hostname.toLowerCase().replace(/^www\./, "");
    const normalizedCompany = companyName.toLowerCase().replace(/\s+/g, " ");
    const fingerprint = await sha256(`${normalizedCompany}|${websiteHost}|${contactEmail}`);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();

    const { data: duplicate } = await admin.from("partner_submissions")
      .select("id,occurrence_count,status")
      .eq("fingerprint", fingerprint)
      .gte("created_at", since)
      .in("status", ["new","reviewing","needs_info","accepted","blocked"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duplicate) {
      await admin.from("partner_submissions").update({
        occurrence_count: Number(duplicate.occurrence_count) + 1,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", duplicate.id);
      return json({ ok: true, state: "merged", submissionId: duplicate.id }, 200, origin);
    }

    const { data, error } = await admin.from("partner_submissions").insert({
      company_name: companyName,
      contact_name: contactName || null,
      contact_email: contactEmail,
      website_url: websiteUrl,
      network: network || null,
      program_url: programUrl || null,
      feed_url: feedUrl || null,
      categories: categories || null,
      message,
      source,
      fingerprint,
    }).select("id").single();

    if (error || !data) return json({ ok: false, error: "save_failed" }, 500, origin);
    return json({ ok: true, state: "created", submissionId: data.id }, 201, origin);
  }

  if (kind === "newsletter") {
    const emailAddress = normalizeEmail(body.email);
    const consent = body.consent === true;
    if (!EMAIL_RE.test(emailAddress) || !consent) return json({ ok: false, error: "invalid_newsletter_input" }, 400, origin);

    const now = new Date().toISOString();
    const { data: existing } = await admin.from("newsletter_subscribers")
      .select("id,status,confirm_token,unsubscribe_token")
      .eq("email", emailAddress)
      .maybeSingle();

    if (existing?.status === "active") return json({ ok: true, state: "already_active" }, 200, origin);

    const confirmToken = randomToken();
    const unsubscribeToken = existing?.unsubscribe_token || randomToken();

    if (existing) {
      const { error } = await admin.from("newsletter_subscribers").update({
        status: "pending",
        source: clean(body.source, 80) || "website",
        consent_text: "Ich möchte den kostenlosen Angebotslotse-Newsletter erhalten und kann mich jederzeit abmelden.",
        consent_at: now,
        confirm_token: confirmToken,
        unsubscribe_token: unsubscribeToken,
        confirmation_sent_at: null,
        confirmed_at: null,
        unsubscribed_at: null,
        updated_at: now,
      }).eq("id", existing.id);
      if (error) return json({ ok: false, error: "save_failed" }, 500, origin);
    } else {
      const { error } = await admin.from("newsletter_subscribers").insert({
        email: emailAddress,
        status: "pending",
        source: clean(body.source, 80) || "website",
        consent_text: "Ich möchte den kostenlosen Angebotslotse-Newsletter erhalten und kann mich jederzeit abmelden.",
        consent_at: now,
        confirm_token: confirmToken,
        unsubscribe_token: unsubscribeToken,
      });
      if (error) return json({ ok: false, error: "save_failed" }, 500, origin);
    }

    const delivery = await sendNewsletterConfirmation(emailAddress, confirmToken, unsubscribeToken);
    if (!delivery.ok) {
      return json({ ok: false, error: delivery.error }, delivery.error === "email_not_configured" ? 503 : 502, origin);
    }

    await admin.from("newsletter_subscribers").update({
      confirmation_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("email", emailAddress);

    return json({ ok: true, state: "pending_confirmation" }, 201, origin);
  }

  const pageUrl = clean(body.pageUrl, 1200);
  const reportType = clean(body.reportType, 50);
  const message = clean(body.message, 2500);
  const reporterEmail = normalizeEmail(body.email);
  const offerSlug = clean(body.offerSlug, 180);
  const ua = clean(req.headers.get("user-agent"), 500);

  if (!pageUrl.startsWith("https://joellehrheuer-code.github.io/angebotslotse/")) {
    return json({ ok: false, error: "invalid_page_url" }, 400, origin);
  }
  if (!REPORT_TYPES.has(reportType) || message.length < 3) {
    return json({ ok: false, error: "invalid_report_input" }, 400, origin);
  }
  if (reporterEmail && !EMAIL_RE.test(reporterEmail)) {
    return json({ ok: false, error: "invalid_email" }, 400, origin);
  }

  const normalizedMessage = message.toLowerCase().replace(/\s+/g, " ").slice(0, 300);
  const fingerprint = await sha256(`${reportType}|${pageUrl}|${offerSlug}|${normalizedMessage}`);
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: duplicate } = await admin.from("site_reports")
    .select("id,occurrence_count")
    .eq("fingerprint", fingerprint)
    .gte("created_at", since)
    .in("status", ["new","triaged","fixing","blocked"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    await admin.from("site_reports").update({
      occurrence_count: Number(duplicate.occurrence_count) + 1,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", duplicate.id);
    return json({ ok: true, state: "merged", reportId: duplicate.id }, 200, origin);
  }

  const priority = ["broken_link","wrong_price","missing_image"].includes(reportType) ? "high" : "normal";
  const { data, error } = await admin.from("site_reports").insert({
    page_url: pageUrl,
    report_type: reportType,
    message,
    reporter_email: reporterEmail || null,
    offer_slug: offerSlug || null,
    source: "website",
    user_agent: ua || null,
    priority,
    fingerprint,
  }).select("id").single();

  if (error || !data) return json({ ok: false, error: "save_failed" }, 500, origin);
  return json({ ok: true, state: "created", reportId: data.id }, 201, origin);
});