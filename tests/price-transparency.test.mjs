import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("current products are not falsely called discount deals without comparison prices",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(build,/const verifiedSavingsCount = topDiscounts\.length;/);
  assert.match(build,/Aktuelle Produktpreise, keine bestätigten Preisnachlässe/);
  assert.match(build,/Alle anderen Karten zeigen den aktuellen Händlerpreis/);
  assert.match(build,/savingsTransparencyModule/);
  assert.match(build,/\$\{pct\?"Deal des Tages":"Produkt des Tages"\}/);
  assert.match(build,/Vergleichspreis \$\{money\(o\.previousPrice,o\.currency\)\}/);
  assert.doesNotMatch(build,/>UVP \$\{money\(o\.previousPrice,o\.currency\)\}/);
});
test("the honest price notice works without a price drop across display themes",()=>{
  const css=fs.readFileSync("public/v13.css","utf8");
  assert.match(css,/\.savings-transparency\{/);
  assert.match(css,/html\[data-theme="light"\] \.savings-transparency/);
  assert.match(css,/html\[data-theme="black"\] \.savings-transparency/);
  assert.match(css,/@media\(max-width:600px\)/);
});
