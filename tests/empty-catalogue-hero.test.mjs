import test from "node:test";
import assert from "node:assert/strict";
import { renderEmptyCatalogueHero } from "../scripts/lib/empty-catalogue-hero.mjs";

test("empty inventory hero keeps a visible H1 and verified-only messaging", () => {
  const html = renderEmptyCatalogueHero(path => "/angebotslotse" + path);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /keine aktuell verifizierten Produktangebote/);
  assert.match(html, /href="\/angebotslotse\/status.html"/);
  assert.match(html, /href="\/angebotslotse\/vergleichen.html"/);
  assert.doesNotMatch(html, /LIVE DEAL RADAR/);
});
