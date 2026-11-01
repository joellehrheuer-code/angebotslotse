import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("hero and top products precede the community without duplicating it",()=>{
 const source=fs.readFileSync("scripts/build.mjs","utf8");
 const home=source.match(/const homeBody=`([^\n]+)`;/)?.[1];
 assert.ok(home,"home composition available");
 assert.ok(home.indexOf("${heroModule}")<home.indexOf("${communityModule}"));
 assert.ok(home.indexOf("${heroModule}")<home.indexOf('offerSection("aktuelle-deals"'));
 assert.equal(home.split("${communityModule}").length-1,1);
});
test("brand typography and mobile menu are readable in each theme",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(css,/V29 — Consistent type/);
 assert.match(css,/\.menu-toggle>span\{/);
 assert.match(css,/background:#fff!important/);
 assert.match(css,/html\[data-theme="light"\] \.menu-toggle/);
 assert.match(css,/html\[data-theme="black"\] \.menu-toggle/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
