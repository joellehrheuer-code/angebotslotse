import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("volunteer tester section has explicit tasks and works with existing feedback forms",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");
  assert.match(build,/id="website-testen"/);
  assert.match(build,/5 kleine Testaufgaben anzeigen/);
  assert.match(build,/ehrliche Hinweise/);
  assert.match(build,/data-report-open>Bug melden/);
  assert.match(build,/\$\{communityModule\}\$\{testerModule\}/);
  assert.match(css,/\.volunteer-tester-section/);
});
