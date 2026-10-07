import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V21 vereinheitlicht Header und globale Suche", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");

  assert.match(build,/global-search-icon/);
  assert.match(build,/global-search-submit/);
  assert.match(build,/Produkte, Marken oder Shops durchsuchen/);
  assert.match(build,/site\.css\?v=47/);

  assert.match(css,/V21 HEADER \+ SEARCH REFINEMENT/);
  assert.match(css,/grid-template-columns:minmax\(178px,auto\) minmax\(340px,1fr\) auto auto 44px/);
  assert.match(css,/\.global-search-submit\{/);
  assert.match(css,/\.header-utility-link>span/);
});

test("Merkliste bleibt funktional verdrahtet", () => {
  const app=fs.readFileSync("public/app.js","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(app,/document\.querySelectorAll\("\[data-watch-toggle\]"\)/);
  assert.match(app,/writeWatchlist\(items\)/);
  assert.match(app,/saved \? "Gemerkt" : "Merken"/);
  assert.match(app,/\[data-watch-count\]/);
  assert.match(build,/data-watch-toggle/);
  assert.match(build,/data-watch-count/);
});
