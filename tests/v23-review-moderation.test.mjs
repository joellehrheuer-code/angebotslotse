import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V23 schützt Bewertungsmoderation und blendet sie nur autorisiert ein", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const client=fs.readFileSync("src/account-client.js","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");
  const fn=fs.readFileSync("supabase/functions/review-moderation/index.ts","utf8");
  const migration=fs.readFileSync("supabase/migrations/20261007131500_review_moderators.sql","utf8");

  assert.match(build,/data-account-review-moderation-card hidden/);
  assert.match(build,/data-review-moderation-list/);
  assert.match(build,/site\.css\?v=48/);
  assert.match(build,/account-client\.js\?v=4/);

  assert.match(client,/functions\.invoke\("review-moderation"/);
  assert.match(client,/body: \{ action: "list" \}/);
  assert.match(client,/data-review-action/);
  assert.match(client,/reviewModerationCard\.hidden = true/);
  assert.match(client,/loadReviewModeration/);

  assert.match(css,/V23 REVIEW MODERATION/);
  assert.match(css,/\.account-review-moderation-card/);

  assert.match(fn,/auth\.getUser\(\)/);
  assert.match(fn,/review_moderators/);
  assert.match(fn,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(fn,/action === "list"/);
  assert.match(fn,/\["approve", "reject"\]/);
  assert.doesNotMatch(fn,/user_metadata/);

  assert.match(migration,/enable row level security/);
  assert.match(migration,/revoke all on table public\.review_moderators from public, anon, authenticated/);
  assert.match(migration,/grant select, insert, update, delete on table public\.review_moderators to service_role/);
  assert.doesNotMatch(migration,/insert into public\.review_moderators/i);
});
