import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V14 behebt die sichtbaren Commerce- und Branding-Probleme", () => {
  const css = fs.readFileSync("public/v13.css", "utf8");
  const build = fs.readFileSync("scripts/build.mjs", "utf8");

  assert.match(css, /V14 COMMERCE POLISH/);
  assert.match(css, /\.partner-creative-grid\{/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.footer-brand-lockup\{/);
  assert.match(css, /\.product-image\.placeholder\{/);

  assert.match(build, /product-media-note/);
  assert.match(build, /placeholders\//);
  assert.match(build, /Kategorieillustration/);
  assert.match(build, /footer-brand-lockup/);
  assert.doesNotMatch(build, /class="footer-wordmark"/);
  assert.match(build, /Partnerangebot öffnen/);
  assert.match(build, /site\.css\?v=\d+/);
});
