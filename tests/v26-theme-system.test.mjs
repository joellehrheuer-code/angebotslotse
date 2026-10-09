import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V26 bietet Light Auto und Black als persistentes 3-Stufen-Theme", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");

  assert.match(build,/data-theme-choice="light"/);
  assert.match(build,/data-theme-choice="auto"/);
  assert.match(build,/data-theme-choice="black"/);
  assert.match(build,/angebotslotse-theme-v1/);

  assert.match(app,/angebotslotse-theme-v1/);
  assert.match(app,/prefers-color-scheme: light/);
  assert.match(app,/dataset\.theme/);

  assert.match(css,/V26 THREE LEVEL THEME SYSTEM/);
  assert.match(css,/html\[data-theme="light"\]/);
  assert.match(css,/html\[data-theme="auto"\]/);
  assert.match(css,/html\[data-theme="black"\]/);
  assert.match(css,/\.theme-switch\{/);
});
