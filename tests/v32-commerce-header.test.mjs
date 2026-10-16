import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("commerce navigation uses live sections and search dropdown stays aligned",()=>{
const build=fs.readFileSync("scripts/build.mjs","utf8");const css=fs.readFileSync("public/v13.css","utf8");const i18n=fs.readFileSync("public/i18n.js","utf8");
assert.match(build,/commerce-type-nav/);
assert.match(build,/Produkte & Deals/);
assert.match(build,/Verträge & Tarife/);
assert.match(build,/Reisen & Freizeit/);
assert.match(css,/V32 — compact commerce navigation/);
assert.match(css,/\.header-search-row \.search-suggest-panel/);
assert.match(css,/left:0!important;right:0!important/);
assert.match(i18n,/🇩🇪 Deutsch/);
assert.match(i18n,/querySelector\("\.header-utilities"\)/);
});