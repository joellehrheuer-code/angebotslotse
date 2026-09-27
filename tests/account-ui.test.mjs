import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Konto-Seite wird mit lokal gebündeltem Supabase-Client gebaut", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://example.test/angebotslotse" }
  });

  const html = fs.readFileSync("dist/konto.html", "utf8");
  const bundle = fs.readFileSync("dist/account-client.js", "utf8");

  assert.match(html, /Konto &amp; Preisalarme/);
  assert.match(html, /data-email-login/);
  assert.match(html, /data-sync-watchlist/);
  assert.match(html, /sb_publishable_/);
  assert.match(html, /googleAuthEnabled":false/);
  assert.match(html, /content="noindex,follow"/);
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
