import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("official DSL and mobile creatives use separate Verivox tracking IDs",()=>{
 const s=fs.readFileSync("scripts/build.mjs","utf8");
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(s,/verivox-creative-grid/);
 assert.match(s,/pid=6994&amp;wmid=78&amp;cpid=1/);
 assert.match(s,/pid=6994&amp;wmid=97&amp;cpid=1/);
 assert.match(s,/Offizieller Verivox Mobilfunk-Banner/);
 assert.match(css,/V45 — Official Verivox creatives/);
});
