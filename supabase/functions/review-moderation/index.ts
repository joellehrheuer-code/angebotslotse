import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const PUBLISHABLE_KEY = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";

const ALLOWED_ORIGINS = new Set([
  "https://joellehrheuer-code.github.io",
  "http://localhost:4173",
  "http://localhost:3000",
]);

const cors = (origin = "") => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://joellehrheuer-code.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Vary": "Origin",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
});

const json = (body: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response("ok", { headers: cors(origin) });
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "origin_not_allowed" }, 403, origin);
  if (!["GET", "POST"].includes(req.method)) return json({ ok: false, error: "method_not_allowed" }, 405, origin);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401, origin);

  try {
    const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ ok: false, error: "unauthorized" }, 401, origin);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: moderator, error: moderatorError } = await admin
      .from("review_moderators")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (moderatorError) throw moderatorError;
    if (!moderator) return json({ ok: false, error: "forbidden" }, 403, origin);

    const listPending = async () => {
      const { data, error } = await admin
        .from("site_reviews")
        .select("id,display_name,rating,comment,status,source,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data || [];
    };

    if (req.method === "GET") {
      return json({ ok: true, reviews: await listPending() }, 200, origin);
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const action = String(body?.action || "").trim().toLowerCase();
    if (action === "list") {
      return json({ ok: true, reviews: await listPending() }, 200, origin);
    }
    if (!UUID_RE.test(id) || !["approve", "reject"].includes(action)) {
      return json({ ok: false, error: "invalid_input" }, 400, origin);
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";
    const timestamp = new Date().toISOString();
    const { data, error } = await admin
      .from("site_reviews")
      .update({ status: nextStatus, moderated_at: timestamp, updated_at: timestamp })
      .eq("id", id)
      .eq("status", "pending")
      .select("id,status")
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ ok: false, error: "review_not_pending" }, 409, origin);

    return json({ ok: true, review: data }, 200, origin);
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "server_error" }, 500, origin);
  }
});
