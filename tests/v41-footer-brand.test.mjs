import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("footer keeps one cohesive accessible brand lockup",()=>{
 const build=fs.readFileSync("scripts/build.mjs","utf8");
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(build,/class="footer-brand-lockup"/);
 assert.match(build,/joel-logo\.svg\?v=4/);
 assert.match(css,/V41 — footer branding/);
 assert.match(css,/\.site-footer \.footer-brand-lockup img/);
 assert.match(css,/\.site-footer a:focus-visible/);
 assert.match(css,/@media\(max-width:680px\)/);
});