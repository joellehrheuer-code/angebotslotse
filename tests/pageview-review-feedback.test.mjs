import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("counter counts real repeat page loads and is visible on all website pages",()=>{
  const app=fs.readFileSync("public/app.js","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(app,/postIntake\(\{ kind:"visit", source:"website-pageview" \}\)/);
  assert.doesNotMatch(app,/sessionStorage\.getItem\("angebotslotse-community-visit-v1"\)/);
  assert.match(build,/live-pageview-counter/);
  assert.match(build,/data-community-visits/);
  assert.match(build,/inklusive wiederholter Besuche/);
  assert.doesNotMatch(build,/So viele Menschen waren schon hier/);
});
test("anonymous review requests concrete improvements and keeps an honest average",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  assert.match(build,/Bitte schreibe auch Verbesserungsvorschläge für die Website/);
  assert.match(build,/Ehrliche Kritik ist willkommen/);
  assert.match(build,/Deine Erfahrung und Verbesserungsvorschläge/);
  assert.match(app,/data\.ratingAverage/);
  assert.doesNotMatch(app,/rating\s*\*\s*20/);
});
