import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V21 vereinheitlicht Header, globale Suche, Konto-Einstieg und Community-Proof", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");

  assert.match(build,/global-search-icon/);
  assert.match(build,/global-search-submit/);
  assert.match(build,/Produkt, Marke oder Shop suchen/);
  assert.match(build,/Deals suchen/);
  assert.match(build,/data-community-visits/);
  assert.match(build,/data-community-rating/);
  assert.match(build,/Dein Angebotslotse-Konto\./);
  assert.match(build,/site\.css\?v=\d+/);

  assert.equal((css.match(/V21 HEADER \+ SEARCH CONSISTENCY/g)||[]).length,1);
  assert.doesNotMatch(css,/V21 HEADER \+ SEARCH REFINEMENT/);
  assert.match(css,/\.header-search-row\{/);
  assert.match(css,/\.global-search-submit\{/);
  assert.match(css,/\.header-utility-link>span/);
  assert.match(css,/\.global-search-wide\{/);
  assert.match(css,/\.community-stat-card>strong\{/);
});

test("Merkliste bleibt funktional verdrahtet", () => {
  const app=fs.readFileSync("public/app.js","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(app,/document\.querySelectorAll\("\[data-watch-toggle\]"/);
  assert.match(app,/writeWatchlist\(items\)/);
  assert.match(app,/saved \? "Gemerkt" : "Merken"/);
  assert.match(app,/\[data-watch-count\]/);
  assert.match(build,/data-watch-toggle/);
  assert.match(build,/data-watch-count/);
});
