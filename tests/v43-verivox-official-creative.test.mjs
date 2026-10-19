import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Verivox DSL creative uses account-specific, sponsored and responsive integration",()=>{
 const build=fs.readFileSync("scripts/build.mjs","utf8");
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(build,/verivox-partner-creative/);
 assert.match(build,/pid=6994&amp;wmid=78&amp;cpid=1/);
 assert.match(build,/Partnerwerbung · Verivox/);
 assert.match(build,/rel="sponsored noopener noreferrer"/);
 assert.match(css,/V43 — Verivox official banner/);
});
