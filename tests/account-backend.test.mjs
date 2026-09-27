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
  assert.match(storage, /'user-assets'/);
  assert.match(storage, /false,\s*10485760/);
  assert.match(storage, /auth\.uid\(\)::text/);
  for (const action of ["select","insert","update","delete"]) {
    assert.match(storage, new RegExp('create policy "user_assets_' + action + '_own"'));
  }
});

test("identische persönliche Alarmregeln werden serverseitig dedupliziert", () => {
  const dedupe = fs.readFileSync("supabase/migrations/20260927_alert_dedupe.sql", "utf8");
  assert.match(dedupe, /create unique index if not exists alert_subscriptions_unique_rule/);
  assert.match(dedupe, /user_id/);
  assert.match(dedupe, /alert_type/);
  assert.match(dedupe, /coalesce\(max_price, -1\)/);
});
