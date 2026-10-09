import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V27 deckt sekundäre Oberflächen in Light Auto und Black ab", () => {
  const css=fs.readFileSync("public/v13.css","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");

  assert.match(css,/V27 THEME COVERAGE/);
  assert.match(css,/html\[data-theme="light"\] \.listing-tools\.listing-filters/);
  assert.match(css,/html\[data-theme="light"\] \.search-suggest-panel/);
  assert.match(css,/html\[data-theme="light"\] \.report-dialog/);
  assert.match(css,/html\[data-theme="light"\] \.mobile-bottom-nav/);
  assert.match(css,/html\[data-theme="black"\] \.listing-tools\.listing-filters/);
  assert.match(css,/@media\(prefers-color-scheme:dark\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(build,/site\.css\?v=\d+/);
});
