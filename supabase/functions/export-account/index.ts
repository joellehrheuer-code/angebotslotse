import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const PUBLISHABLE_KEY = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
const ALLOWED_ORIGIN = "https://joellehrheuer-code.github.io";

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors(origin) });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401, headers: cors(origin) });

    const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return new Response("Unauthorized", { status: 401, headers: cors(origin) });

    const [profile, saved, alerts, preferences, notifications] = await Promise.all([
      client.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      client.from("saved_offers").select("*").eq("user_id", user.id).order("created_at"),
      client.from("alert_subscriptions").select("*").eq("user_id", user.id).order("created_at"),
      client.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      client.from("user_notifications").select("*").eq("user_id", user.id).order("created_at")
    ]);

    for (const result of [profile, saved, alerts, preferences, notifications]) {
      if (result.error) throw result.error;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
        providers: user.app_metadata?.providers ?? []
      },
      profile: profile.data ?? null,
      savedOffers: saved.data ?? [],
      alertSubscriptions: alerts.data ?? [],
      notificationPreferences: preferences.data ?? null,
      notifications: notifications.data ?? []
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        ...cors(origin),
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="angebotslotse-meine-daten.json"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: cors(origin) }
    );
  }
});