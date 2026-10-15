import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("home hero remains compact so product cards appear early",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 const build=fs.readFileSync("scripts/build.mjs","utf8");
 assert.match(css,/V30 — Above-the-fold product-first/);
 assert.match(css,/\.portal-hero\{\s*min-height:0!important/);
 assert.match(css,/#aktuelle-deals\{padding-top:20px!important\}/);
 const home=build.match(/const homeBody=`([^\n]+)`;/)?.[1]||"";
 assert.ok(home.indexOf("${communityModule}")<home.indexOf("${heroModule}"));
 assert.ok(home.indexOf("${heroModule}")<home.indexOf('offerSection("aktuelle-deals"'));
});
