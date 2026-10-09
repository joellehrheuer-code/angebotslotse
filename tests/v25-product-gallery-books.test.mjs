import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V25 zeigt echte Produktgalerien und bessere Buchvorschauen", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");

  assert.match(build,/data-product-gallery/);
  assert.match(build,/data-gallery-main/);
  assert.match(build,/data-gallery-thumb/);
  assert.match(build,/book-preview-rail/);
  assert.match(build,/Vorderseiten-Vorschau/);
  assert.match(build,/Buchrücken-Vorschau/);
  assert.match(build,/Rückseiten-Vorschau/);

  assert.match(app,/echte Produktbild-Galerien/);
  assert.match(app,/data-gallery-thumb/);

  assert.match(css,/V25 PRODUCT GALLERY \+ BOOK PREVIEWS/);
  assert.match(css,/\.image-gallery\{/);
  assert.match(css,/\.book-preview-rail\{/);
  assert.match(css,/\.book-mock\{/);
});
