import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const PUBLISHABLE_KEY = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
const SECRET_KEY = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGIN = "https://joellehrheuer-code.github.io";

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
});

async function removeTree(admin: any, userId: string, prefix = userId, depth = 0): Promise<number> {
  if (depth > 5) throw new Error("storage_depth_limit");
  let removed = 0;
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from("user-assets").list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" }
    });
    if (error) throw error;
    if (!data?.length) break;

    const files: string[] = [];
    for (const item of data) {
      const path = prefix + "/" + item.name;
      if (item.id) files.push(path);
      else removed += await removeTree(admin, userId, path, depth + 1);
    }
    if (files.length) {
      const { error: removeError } = await admin.storage.from("user-assets").remove(files);
      if (removeError) throw removeError;
      removed += files.length;
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return removed;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors(origin) });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401, headers: cors(origin) });

    const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return new Response("Unauthorized", { status: 401, headers: cors(origin) });

    const body = await req.json().catch(() => ({}));
    if (body?.confirmation !== "KONTO LÖSCHEN") {
      return Response.json({ ok: false, error: "confirmation_required" }, { status: 400, headers: cors(origin) });
    }

    const admin = createClient(SUPABASE_URL, SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const removedFiles = await removeTree(admin, user.id);
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return Response.json({ ok: true, removedFiles }, { headers: cors(origin) });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: cors(origin) }
    );
  }
});