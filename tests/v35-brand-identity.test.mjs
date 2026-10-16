import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Angebotslotse keeps its warm orange identity with readable cards",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(css,/V35 — Angebotslotse identity/);
 assert.match(css,/--lotse-accent:#ffad52/);
 assert.match(css,/\.deal-card:hover\{border-color:rgba\(255,173,82/);
 assert.match(css,/font-variant-numeric:tabular-nums/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/html\[data-theme="light"\]/);
});