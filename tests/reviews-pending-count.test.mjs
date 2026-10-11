import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("public moderation counts pending reviews but never leaks their text or gives them stars",()=>{
  const backend=fs.readFileSync("supabase/functions/public-intake/index.ts","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(backend,/pendingReviewCount/);
  assert.match(backend,/\.select\("id", \{ count: "exact", head: true \}\)\.eq\("status", "pending"\)/);
  assert.match(backend,/reviewCount: ratingValues\.length/);
  assert.match(backend,/ratingAverage/);
  assert.match(app,/data\?\.pendingReviewCount/);
  assert.match(app,/pendingCount === 0/);
  assert.match(app,/wartet" : "Bewertungen warten"/);
  assert.match(build,/data-community-pending hidden/);
  assert.doesNotMatch(backend,/ratingValues\.push\(.*pending/);
});
