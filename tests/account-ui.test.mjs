import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Konto-Seite wird mit lokal gebündeltem Supabase-Client gebaut", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });

  const html = fs.readFileSync("dist/konto.html", "utf8");
  const privacy = fs.readFileSync("dist/datenschutz.html", "utf8");
  const feed = JSON.parse(fs.readFileSync("dist/alerts-feed.json", "utf8"));
  const bundle = fs.readFileSync("dist/account-client.js", "utf8");
  const sw = fs.readFileSync("dist/sw.js", "utf8");

  assert.match(html, /Konto &amp; Preisalarme/);
  assert.match(html, /data-email-login/);
  assert.match(html, /data-sync-watchlist/);
  assert.match(html, /data-alert-form/);
  assert.match(html, /data-alert-list/);
  assert.match(html, /Neue Angebote automatisch beobachten/);
  assert.match(html, /sb_publishable_/);
  assert.match(html, /googleAuthEnabled":false/);
  assert.match(html, /content="noindex,follow"/);
  assert.match(privacy, /Bei freiwilliger Kontoanmeldung können Merkliste, Wunschpreise, Alarmregeln, Benachrichtigungseinstellungen und – nur bei aktiviertem Cashback – zugeordnete Cashback-Ansprüche/);
  assert.match(privacy, /nicht öffentlichen Supabase-Storage-Bereich/);
  assert.ok(Array.isArray(feed.offers));
  assert.ok(feed.offers.length > 0);
  assert.equal("trackingUrl" in feed.offers[0], false);
  assert.equal("affiliateUrl" in feed.offers[0], false);
  assert.match(html, /data-alert-matches/);
  assert.match(html, /data-notification-list/);
  assert.match(html, /data-export-account/);
  assert.match(html, /data-delete-account/);
  assert.match(html, /data-account-push-card/);
  assert.match(html, /data-push-enable/);
  assert.match(html, /data-push-price/);
  assert.match(html, /data-push-matches/);
  assert.match(html, /webPushVapidPublicKey/);
  assert.match(bundle, /push-subscription/);
  assert.match(bundle, /pushManager\.subscribe/);
  assert.match(sw, /addEventListener\("push"/);
  assert.match(sw, /addEventListener\("notificationclick"/);
  assert.match(bundle, /user_notifications/);
  assert.match(bundle, /postgres_changes/);
  assert.match(bundle, /export-account/);
  assert.match(bundle, /delete-account/);
  assert.ok(bundle.length > 1000);
  assert.doesNotMatch(bundle, /SUPABASE_SECRET_KEY|service_role|RESEND_API_KEY/);
});

test("CI installiert gepinnte Account-Abhängigkeiten reproduzierbar", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const update = fs.readFileSync(".github/workflows/update.yml", "utf8");
  const integrity = fs.readFileSync(".github/workflows/integrity.yml", "utf8");

  assert.equal(pkg.dependencies["@supabase/supabase-js"], "2.117.2");
  assert.equal(pkg.devDependencies.esbuild, "0.25.10");
  assert.match(pkg.scripts.build, /build-account-client/);
  assert.match(update, /npm ci/);
  assert.match(integrity, /npm ci/);
});
