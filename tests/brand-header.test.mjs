import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Header und Browser-Tab nutzen das bestätigte Angebotslotse-Branding", () => {
  const build = fs.readFileSync("scripts/build.mjs", "utf8");
  const v13 = fs.readFileSync("public/v13.css", "utf8");

  assert.match(build, /brand-name">Angebotslotse/);
  assert.match(build, /Joel271997 \/ J0JOEL/);
  assert.match(build, /joel-logo\.svg\?v=3/);
  assert.doesNotMatch(build, /<link rel="icon" href="\$\{url\("\/favicon\.svg"\)\}"/);
  assert.match(build, /site\\.css\\?v=\\d+/);
  assert.match(v13, /V13\.4 CANONICAL BRAND HEADER/);
  assert.match(v13, /\.header-brand \.brand-name/);
  assert.match(v13, /grid-template-columns:minmax\(0,1fr\) 44px/);
});
