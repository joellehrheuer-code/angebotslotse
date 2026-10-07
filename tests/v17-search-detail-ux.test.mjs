import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V17 verbessert Filter und Angebotsdetailseiten", () => {
  const css=fs.readFileSync("public/v13.css","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const app=fs.readFileSync("public/app.js","utf8");

  assert.match(css,/V17 SEARCH \+ DETAIL UX/);
  assert.match(css,/\.filter-mobile-toggle/);
  assert.match(css,/\.detail-voucher/);
  assert.match(css,/\.detail-commerce-facts/);
  assert.match(css,/\.offer-primary-action/);

  assert.match(build,/data-filter-mobile-toggle/);
  assert.match(build,/data-copy-code=/);
  assert.match(build,/data-copy-code-status/);
  assert.match(build,/site\.css\?v=48/);
  assert.match(build,/app\.js\?v=23/);

  assert.match(app,/mobileFilterToggle/);
  assert.match(app,/mobileFilterCount/);
  assert.match(app,/Code kopiert\./);
  assert.match(app,/Kopiert ✓/);
});
