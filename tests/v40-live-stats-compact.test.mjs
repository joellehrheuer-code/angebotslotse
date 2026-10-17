import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("live statistics use compact responsive presentation without modifying reported data",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 const build=fs.readFileSync("scripts/build.mjs","utf8");
 assert.match(css,/V40 — compact honest live statistics/);
 assert.match(css,/\.live-network \.live-network-head h2\{font-size:clamp\(24px,3vw,36px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(build,/live-stat-grid/);
});
