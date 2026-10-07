import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V22 macht Merken sichtbar und speicherbar", () => {
  const app=fs.readFileSync("public/app.js","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");

  assert.match(app,/function writeWatchlist\(items\)/);
  assert.match(app,/return stored/);
  assert.match(app,/showUiToast/);
  assert.match(app,/Zur Merkliste hinzugefügt\./);
  assert.match(app,/Aus der Merkliste entfernt\./);
  assert.match(app,/Merkliste konnte in diesem Browser nicht gespeichert werden\./);

  assert.match(css,/V22 WATCHLIST FEEDBACK/);
  assert.match(css,/\.ui-toast\{/);
  assert.match(css,/\.ui-toast\.show/);

  assert.match(build,/site\.css\?v=\d+/);
  assert.match(build,/app\.js\?v=\d+/);
});
