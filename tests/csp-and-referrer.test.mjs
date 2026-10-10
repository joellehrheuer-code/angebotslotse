import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("GitHub Pages generated HTML gets a CSP before any executable inline script",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(build,/const SITE_CSP=\[/);
  assert.match(build,/object-src 'none'/);
  assert.match(build,/base-uri 'self'/);
  assert.match(build,/script-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(build,/unsafe-eval/);
  assert.match(build,/http-equiv="Content-Security-Policy"/);
  assert.match(build,/meta name="referrer" content="strict-origin-when-cross-origin"/);
  const firstPageHead=build.indexOf('<head><meta charset="utf-8"><meta name="viewport"');
  assert.ok(firstPageHead>=0);
  const inlineScriptAt=build.indexOf('<script>',firstPageHead);
  assert.ok(inlineScriptAt>firstPageHead);
  const fragment=build.slice(firstPageHead,inlineScriptAt);
  assert.ok(fragment.includes('${SITE_CSP_META}'));
});
test("explicit third-party partners only load scripts from named hosts",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(build,/https:\/\/\*\.spreadshop\.net/);
  assert.match(build,/https:\/\/\*\.instant-gaming\.com/);
  assert.match(build,/https:\/\/static\.cloudflareinsights\.com/);
});
