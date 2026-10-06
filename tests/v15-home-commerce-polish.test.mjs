import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V15 beruhigt Startseite, Deal-Rails und Hero-Branding", () => {
  const css = fs.readFileSync("public/v13.css", "utf8");
  const build = fs.readFileSync("scripts/build.mjs", "utf8");

  assert.match(css, /V15 HOME COMMERCE POLISH/);
  assert.match(css, /grid-auto-columns:clamp\(278px,21vw,322px\)/);
  assert.match(css, /\.hero-logo-stage/);
  assert.match(css, /\.trust-quality-grid/);
  assert.match(css, /\.daily-deal/);

  assert.match(build, /hero-logo-stage/);
  assert.match(build, /joel-logo\.svg\?v=4/);
  assert.match(build, /site\.css\?v=45/);
});
