import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("all six supported website languages are wired into every generated page", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const code=fs.readFileSync("public/i18n.js","utf8");
  assert.ok(build.includes("i18n.js?v=${assetVersion}"));
  for(const lang of ["de","en","fr","es","ja","ru"]) {
    assert.match(code,new RegExp(lang+":"));
  }
  assert.ok(build.includes('readFile("public/i18n.js")'));
  assert.match(code,/localStorage\.setItem\(key,language\)/);
  assert.match(code,/document\.documentElement\.lang = language/);
  assert.match(code,/addEventListener\("change"/);
  assert.match(code,/focus-visible/);
});
