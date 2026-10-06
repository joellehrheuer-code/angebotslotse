import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260927_accounts_alerts.sql", "utf8");
const envExample = fs.readFileSync(".env.example", "utf8");
const securityCheck = fs.readFileSync("scripts/security-check.mjs", "utf8");

test("Kontodatenmodell trennt öffentliche Nutzerdaten von privaten Versanddaten", () => {
  for (const table of ["user_profiles","saved_offers","alert_subscriptions","notification_preferences"]) {
    assert.match(migration, new RegExp("create table if not exists public\\." + table));
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security"));
  }
  for (const table of ["newsletter_consents","push_subscriptions","notification_outbox","notification_events"]) {
    assert.match(migration, new RegExp("create table if not exists private\\." + table));
  }
  assert.match(migration, /revoke all on schema private from public, anon, authenticated/);
});

test("RLS bindet Nutzerzeilen an auth.uid und anon erhält keinen Zugriff", () => {
  assert.ok((migration.match(/auth\.uid\(\)/g) || []).length >= 8);
  for (const table of ["user_profiles","saved_offers","alert_subscriptions","notification_preferences"]) {
    assert.match(migration, new RegExp("revoke all on public\\." + table + " from anon"));
  }
  assert.doesNotMatch(migration, /grant\s+.*newsletter_consents.*authenticated/i);
  assert.doesNotMatch(migration, /grant\s+.*notification_outbox.*authenticated/i);
});

test("nur veröffentlichbare Supabase-Konfiguration ist als Browser-Konfiguration vorgesehen", () => {
  assert.match(envExample, /SUPABASE_PUBLISHABLE_KEY=/);
  assert.match(envExample, /SUPABASE_SECRET_KEY=server_only_never_public/);
  assert.match(securityCheck, /SUPABASE_SECRET_KEY/);
  assert.match(securityCheck, /RESEND_API_KEY/);
});


test("private Versandtabellen haben zusätzliche RLS-Schutzschicht ohne Client-Policies", () => {
  const privateRls = fs.readFileSync("supabase/migrations/20260927_private_rls.sql", "utf8");
  for (const table of ["newsletter_consents","push_subscriptions","notification_outbox","notification_events"]) {
    assert.match(privateRls, new RegExp("alter table private\\." + table + " enable row level security"));
  }
  assert.doesNotMatch(privateRls, /^\s*create policy/im);
});

test("Cloud-Speicher ist privat, größenbegrenzt und auf den eigenen Nutzerordner beschränkt", () => {
  const storage = fs.readFileSync("supabase/migrations/20260927_user_assets_storage.sql", "utf8");
  const reconciliation = fs.readFileSync("supabase/migrations/20261006_reconcile_user_assets_storage.sql", "utf8");
  assert.match(storage, /'user-assets'/);
  assert.match(storage, /false,\s*10485760/);
  assert.match(storage, /auth\.uid\(\)::text/);
  for (const action of ["select","insert","update","delete"]) {
    assert.match(storage, new RegExp('create policy "user_assets_' + action + '_own"'));
  }
  assert.match(reconciliation, /file_size_limit\s*=\s*5242880/);
  assert.match(reconciliation, /create or replace function public\.can_upload_user_asset\(\)/);
  assert.match(reconciliation, /from storage\.objects/);
  assert.match(reconciliation, /\) < 20/);
  assert.match(reconciliation, /and public\.can_upload_user_asset\(\)/);
  assert.match(reconciliation, /revoke all on function public\.can_upload_user_asset\(\) from public, anon/);
});

test("identische persönliche Alarmregeln werden serverseitig dedupliziert", () => {
  const dedupe = fs.readFileSync("supabase/migrations/20260927_alert_dedupe.sql", "utf8");
  assert.match(dedupe, /create unique index if not exists alert_subscriptions_unique_rule/);
  assert.match(dedupe, /user_id/);
  assert.match(dedupe, /alert_type/);
  assert.match(dedupe, /coalesce\(max_price, -1\)/);
});


test("Cloud-Runtime hält persönliche Meldungen serverseitig erzeugt und RLS-geschützt", () => {
  const runtime = fs.readFileSync("supabase/migrations/20260927_cloud_runtime.sql", "utf8");
  assert.match(runtime, /create table if not exists public\.user_notifications/);
  assert.match(runtime, /alter table public\.user_notifications enable row level security/);
  assert.match(runtime, /grant select, update, delete on public\.user_notifications to authenticated/);
  assert.doesNotMatch(runtime, /grant insert on public\.user_notifications to authenticated/i);
  assert.match(runtime, /evaluate-angebotslotse-alerts-hourly/);
  assert.match(runtime, /prune-angebotslotse-notifications/);
  assert.match(runtime, /vault\.create_secret/);
  assert.doesNotMatch(runtime, /alert_cron_token'\s*,\s*'[A-Fa-f0-9]{32,}/);
});

test("produktive Edge Functions liegen versioniert im Repository", () => {
  const evaluator = fs.readFileSync("supabase/functions/evaluate-alerts/index.ts", "utf8");
  const deletion = fs.readFileSync("supabase/functions/delete-account/index.ts", "utf8");
  const exporter = fs.readFileSync("supabase/functions/export-account/index.ts", "utf8");

  assert.match(evaluator, /MAX_MATCHES_PER_RULE = 12/);
  assert.match(evaluator, /verify_alert_cron_token/);
  assert.match(evaluator, /user_notifications/);
  assert.match(deletion, /KONTO LÖSCHEN/);
  assert.match(deletion, /auth\.admin\.deleteUser/);
  assert.match(exporter, /angebotslotse-meine-daten\.json/);
  for (const source of [evaluator, deletion, exporter]) {
    assert.doesNotMatch(source, /sb_secret_|service_role\s*[:=]\s*["'][A-Za-z0-9._-]+/);
  }
});


test("Web-Push-Runtime bleibt Vault-geschützt und serverseitig", () => {
  const migration = fs.readFileSync("supabase/migrations/20260927_web_push_runtime.sql", "utf8");
  const subscribe = fs.readFileSync("supabase/functions/push-subscription/index.ts", "utf8");
  const sender = fs.readFileSync("supabase/functions/send-push/index.ts", "utf8");

  assert.match(migration, /push_subscription_crypto_key/);
  assert.match(migration, /web_push_vapid_private/);
  assert.match(migration, /verify_push_cron_token/);
  assert.match(migration, /user_notifications_queue_push/);
  assert.match(migration, /send-angebotslotse-push/);
  assert.match(migration, /\*\/5 \* \* \* \*/);
  assert.match(migration, /grant execute on function public\.push_store_subscription/);
  assert.doesNotMatch(migration, /BEGIN PRIVATE KEY|sb_secret_|service_role\s*[:=]\s*["'][A-Za-z0-9._-]+/);

  assert.match(subscribe, /auth\.getUser/);
  assert.match(subscribe, /push_store_subscription/);
  assert.match(sender, /verify_push_cron_token/);
  assert.match(sender, /webpush\.sendNotification/);
  assert.match(sender, /push_finish_outbox/);
  assert.doesNotMatch(subscribe + sender, /BEGIN PRIVATE KEY|sb_secret_/);
});
