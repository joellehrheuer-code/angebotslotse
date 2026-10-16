import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("quick search indexes all published offers and exposes full-results link",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");
  const catalog=build.slice(build.indexOf("const quickSearchCatalog="),build.indexOf("const quickSearchDataScript="));
  assert.match(catalog,/products:offers\.filter\(o=>o\.slug\)/);
  assert.doesNotMatch(catalog,/\.slice\(0,120\)/);
  assert.match(app,/className/);
  assert.match(app,/search-suggest-all/);
  assert.match(app,/encodeURIComponent\(q\)/);
  assert.match(css,/V38 — Search results affordance/);
});