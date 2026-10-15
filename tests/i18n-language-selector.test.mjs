import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("all six supported website languages are wired into every generated page", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const code=fs.readFileSync("public/i18n.js","utf8");
  assert.match(build,/i18n\.js\?v=1/);
  for(const lang of ["de","en","fr","es","ja","ru"]) {
    assert.match(code,new RegExp(lang+":"));
  }
  assert.match(build,/readFile\\("public\\/i18n\\.js"\\)/);
  assert.match(code,/localStorage\.setItem\(key,language\)/);
  assert.match(code,/document\.documentElement\.lang = language/);
  assert.match(code,/addEventListener\("change"/);
  assert.match(code,/focus-visible/);
});
