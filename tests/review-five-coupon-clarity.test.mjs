import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("die Community zeigt bis zu fünf echte freigegebene Bewertungen", () => {
  const app=readFileSync("public/app.js","utf8");
  assert.match(app,/Math\.min\(5,reviews\.length\)/);
  assert.match(app,/reviews\.length > 5/);
  assert.match(app,/data\.reviews\.filter\(item => item && item\.comment\)/);
});
test("Gutscheincode wird als Händler-Rabattcode erklärt", () => {
  const build=readFileSync("scripts/build.mjs","utf8");
  assert.match(build,/const hasDisplayVoucher=o=>/);
  assert.match(build,/Rabattcode für den Händler/);
  assert.match(build,/data-copy-voucher/);
  assert.match(build,/Die Ziffern im Code sind kein garantierter Rabatt/);
});
