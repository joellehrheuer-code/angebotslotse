import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("compact community preview precedes offers without exposing full review form",()=>{
 const build=fs.readFileSync("scripts/build.mjs","utf8");
 const app=fs.readFileSync("public/app.js","utf8");
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(build,/community-proof-compact/);
 assert.match(build,/community-review-disclosure/);
 assert.match(build,/<summary>★ Bewertung oder Kommentar abgeben/);
 assert.match(app,/data-community-expand-form/);
 assert.match(css,/\.community-proof-compact \.community-review-list/);
 assert.match(css,/max-height:96px/);
 assert.match(app,/Math\.min\(5,reviews\.length\)/);
 assert.match(app,/reviews\.length > 5/);
});
