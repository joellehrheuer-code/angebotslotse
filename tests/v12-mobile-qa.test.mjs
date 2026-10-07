import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("V12.3 fixes mobile category sizing and primary touch targets", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });
  const css=fs.readFileSync("public/enhancements.css","utf8");
  const html=fs.readFileSync("dist/index.html","utf8");
  const sw=fs.readFileSync("dist/sw.js","utf8");
  assert.match(css,/V12\.3 MOBILE QA/);
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.category-grid\{[\s\S]*?display:grid!important/);
  assert.match(css,/\.category-grid>a,[\s\S]*?\.category-tile\{[\s\S]*?min-width:0!important/);
  assert.match(css,/\.rail-actions button\{[\s\S]*?width:44px!important;[\s\S]*?height:44px!important/);
  assert.match(css,/\.watch-button\{[\s\S]*?min-height:44px!important/);
  assert.match(css,/\.live-store-strip>div a\{[\s\S]*?min-height:44px!important/);
  assert.match(css,/@media\(max-width:480px\)\{[\s\S]*?\.category-grid\{[\s\S]*?grid-template-columns:1fr!important/);
  assert.match(html,/site\.css\?v=46/);
  assert.match(sw,/angebotslotse-shell-v17/);
});
