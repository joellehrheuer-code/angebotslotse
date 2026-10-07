import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V19 zeigt nur echte Community-Daten und moderierte Bewertungen", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");
  const fn=fs.readFileSync("supabase/functions/public-intake/index.ts","utf8");
  const sql=fs.readFileSync("supabase/migrations/20261006_community_reviews_visits.sql","utf8");

  assert.match(build,/data-community-root/);
  assert.match(build,/data-community-visits/);
  assert.match(build,/data-community-rating/);
  assert.match(build,/data-community-review-form/);
  assert.match(build,/ECHTE COMMUNITY · KEINE FAKE-STIMMEN/);
  assert.match(build,/site\.css\?v=46/);
  assert.match(build,/app\.js\?v=23/);
  assert.doesNotMatch(build,/\b4[.,]9\b[^\n]*Bewertung/);

  assert.match(app,/sessionStorage\.getItem\("angebotslotse-community-visit-v1"\)/);
  assert.match(app,/kind:"visit"/);
  assert.match(app,/kind:"review"/);
  assert.match(app,/erscheint nach kurzer Prüfung/);
  assert.match(app,/communityRotateTimer/);

  assert.match(css,/V19 COMMUNITY TRUST/);
  assert.match(css,/\.community-proof\{/);
  assert.match(css,/\.community-review-form\{/);

  assert.match(fn,/status", "approved"/);
  assert.match(fn,/pending_moderation/);
  assert.match(fn,/increment_site_visit/);
  assert.match(fn,/communitySnapshot/);
  assert.match(fn,/kind === "review"/);
  assert.match(fn,/kind === "visit"/);

  assert.match(sql,/enable row level security/);
  assert.match(sql,/revoke all on table public\.site_reviews from public, anon, authenticated/);
  assert.match(sql,/revoke all on table public\.site_traffic from public, anon, authenticated/);
});
