import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("V12.4 phase 1 removes the known legacy mobile conflicts", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });
  const source=fs.readFileSync("public/enhancements.css","utf8");
  const built=fs.readFileSync("dist/site.css","utf8");
  assert.doesNotMatch(source,/\.category-grid\{display:flex;overflow-x:auto;scroll-snap-type:x mandatory\}/);
  assert.doesNotMatch(source,/\.category-grid a\{min-width:44vw;scroll-snap-align:start\}/);
  assert.doesNotMatch(source,/\.category-grid a\{min-width:58vw\}/);
  assert.doesNotMatch(source,/\.rail-actions button\{width:36px;height:36px\}/);
  assert.doesNotMatch(source,/min-height:42px!important;padding:0 10px!important/);
  assert.match(source,/\.category-grid\{display:grid;overflow:visible;scroll-snap-type:none\}/);
  assert.match(source,/V12\.3 MOBILE QA/);
  assert.match(built,/\.category-grid/);
});
