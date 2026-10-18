import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("feedback and daily deal stay compact and responsive",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 const build=fs.readFileSync("scripts/build.mjs","utf8");
 assert.match(css,/V42: compact feedback\/tester/);
 assert.match(css,/\.volunteer-tester-actions \.button\.primary/);
 assert.match(css,/\.volunteer-tester-tasks\[open\]/);
 assert.match(css,/\.daily-deal \.daily-media img/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(build,/data-report-open/);
 assert.match(build,/id="deal-des-tages"/);
});