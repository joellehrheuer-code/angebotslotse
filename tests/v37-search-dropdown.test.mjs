import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("search button stays right and full-width scrollable suggestions appear below",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 const app=fs.readFileSync("public/app.js","utf8");
 assert.match(css,/V37 — search control stays in first row/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto!important/);
 assert.match(css,/\.global-search-submit\{[\s\S]*?grid-column:2!important;grid-row:1!important/);
 assert.match(css,/\.search-suggest-panel:not\(\[hidden\]\)\{[\s\S]*?grid-column:1\/-1!important;grid-row:2!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(app,/if\(!field\.value\.trim\(\)\)\{event\.preventDefault\(\);render\(\);field\.focus\(\);return;/);
 assert.match(app,/rememberSearch\(field\.value\)/);
});
