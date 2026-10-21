import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("comparison category hash navigates to active carousel card",()=>{
 const app=fs.readFileSync("public/app.js","utf8");
 assert.match(app,/const selectHash=\(\)=>/);
 assert.match(app,/window\.addEventListener\("hashchange",selectHash\)/);
 assert.match(app,/render\(\);selectHash\(\)/);
});
