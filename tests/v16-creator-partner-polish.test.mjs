import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V16 vereinheitlicht Creator-, Projekt- und Partnerbereiche", () => {
  const css = fs.readFileSync("public/v13.css", "utf8");
  const build = fs.readFileSync("scripts/build.mjs", "utf8");

  assert.match(css, /V16 CREATOR \+ PARTNER POLISH/);
  assert.match(css, /\.creator-world\{/);
  assert.match(css, /\.creator-video-grid\{/);
  assert.match(css, /\.creator-media-grid\{/);
  assert.match(css, /\.owned-showcase-grid\{/);
  assert.match(css, /\.partner-creative-grid\{/);
  assert.match(css, /\.partner-section#partner>div\{/);

  assert.match(build, /joel-logo\.svg\?v=4/);
  assert.match(build, /site\.css\?v=43/);
});
