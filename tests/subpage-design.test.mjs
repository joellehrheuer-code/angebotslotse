import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Kategorien, Shops und Vergleiche nutzen die kanonische V13.6-Regel", () => {
  const css = fs.readFileSync("public/v13.css", "utf8");
  const build = fs.readFileSync("scripts/build.mjs", "utf8");

  assert.match(css, /V13\.6 CANONICAL DIRECTORY \+ COMPARISON SUBPAGES/);
  assert.match(css, /\.shop-grid,/);
  assert.match(css, /\.comparison-service-grid\{/);
  assert.match(css, /\.categories-page \.category-grid\.large/);
  assert.match(build, /site\.css\?v=\d+/);
});
