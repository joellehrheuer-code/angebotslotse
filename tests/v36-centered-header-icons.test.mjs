import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("navigation uses real inline vector icons and one centered search-social-category axis",()=>{
const build=fs.readFileSync("scripts/build.mjs","utf8");
const css=fs.readFileSync("public/v13.css","utf8");
const nav=build.slice(build.indexOf('class="commerce-type-nav"'),build.indexOf('<nav id="main-nav"'));
assert.equal((nav.match(/class="commerce-icon"/g)||[]).length,6);
assert.doesNotMatch(nav,/🛍️|⚡|✈️|🎟️|🎵|🏷️/);
assert.match(css,/V36 — one visual axis/);
assert.match(css,/\.search-suggest-panel:not\(\[hidden\]\)/);
assert.match(css,/position:relative!important;top:auto!important/);
assert.match(css,/\.creator-top-dock\{width:var\(--lotse-header-width\)/);
assert.match(css,/\.commerce-type-nav\{width:min\(1200px/);
});