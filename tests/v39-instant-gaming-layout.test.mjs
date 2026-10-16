import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Instant Gaming partner module stays centered and legible",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(css,/V39 — Instant Gaming partner section/);
 assert.match(css,/\.instant-gaming-showcase\.partner-section\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
 assert.match(css,/\.instant-gaming-showcase\.partner-section>\.instant-gaming-showcase-copy/);
 assert.match(css,/@media\(max-width:850px\)/);
});
