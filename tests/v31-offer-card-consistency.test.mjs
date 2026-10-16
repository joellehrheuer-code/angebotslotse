import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("offer cards and actions are consistent and accessible",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(css,/V31 — consistent, accessible offer cards/);
 assert.match(css,/\.deal-card \.deal-content\{min-height:0!important/);
 assert.match(css,/\.deal-card \.button,\.deal-card a\.button\{min-height:44px/);
 assert.match(css,/\.deal-card :is\(a,button\):focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(hover:none\)/);
});
