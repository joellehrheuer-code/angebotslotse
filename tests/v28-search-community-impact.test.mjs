import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V28 platziert Suche sowie echte Besucher und Bewertungen prominent", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");

  assert.match(build,/header-search-row/);
  assert.match(build,/global-search-wide/);
  assert.match(build,/Was möchtest du finden\? Produkt, Marke oder Shop/);
  assert.doesNotMatch(build,/hero-search-form smart-search-form/);

  assert.match(build,/So häufig wurde Angebotslotse schon aufgerufen\./);
  assert.match(build,/community-stat-card visits/);
  assert.match(build,/community-stat-card rating/);
  assert.match(build,/data-community-review-list/);
  assert.match(build,/data-community-visits/);
  assert.match(build,/data-community-review-count/);

  assert.match(css,/V28 SEARCH \+ COMMUNITY IMPACT/);
  assert.match(css,/\.global-search-wide\{/);
  assert.match(css,/\.community-stat-card>strong\{/);
  assert.match(css,/\.community-review-list\{/);
});
