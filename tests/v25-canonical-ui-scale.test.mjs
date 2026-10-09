import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V25 vereinheitlicht Startseiten-Überschriften und Header-Bedienelemente", () => {
  const css=fs.readFileSync("public/v13.css","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");

  assert.match(css,/V25 CANONICAL UI SCALE/);
  assert.match(css,/--v25-section-title:clamp\(34px,3\.35vw,50px\)/);
  assert.match(css,/--v25-control-height:44px/);
  assert.match(css,/\.section-head h2,/);
  assert.match(css,/\.header-links a,/);
  assert.match(css,/\.header-utility-link,/);
  assert.match(css,/\.global-search-submit\{/);
  assert.match(build,/site\.css\?v=\d+/);
});
