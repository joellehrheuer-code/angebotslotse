import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Startseite, Deal-Karten und Mobile-Navigation nutzen die kanonische V13.5-Regel", () => {
  const css = fs.readFileSync("public/v13.css", "utf8");
  const build = fs.readFileSync("scripts/build.mjs", "utf8");

  assert.match(css, /V13\.5 CANONICAL HOME \+ DEALS \+ MOBILE NAV/);
  assert.match(css, /\.deal-card \.deal-content\{/);
  assert.match(css, /\.mobile-bottom-nav\{/);
  assert.match(css, /@media\(max-width:420px\)/);
  assert.match(build, /site\.css\?v=\d+/);
});
