import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Header-Suche besitzt vollständige Combobox/Listbox-Semantik", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(build,/id="global-search"[^>]*role="combobox"[^>]*aria-expanded="false"[^>]*aria-controls="global-search-panel"/);
  assert.match(build,/id="global-search-panel"[^>]*role="listbox"[^>]*aria-label="Suchvorschläge"/);
  assert.match(build,/id="mobile-nav-search"[^>]*role="combobox"/);
  assert.match(build,/id="hero-search"[^>]*role="combobox"/);
  assert.match(build,/class="menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="main-nav"/);
  assert.match(build,/class="skip-link" href="#main-content"/);
  assert.match(build,/live-top-status" role="group" aria-label="Aktueller Angebotslotse-Status"/);
});

test("Smart Search unterstützt Pfeiltasten, Enter, Escape und aktives ARIA-Element", () => {
  const app=fs.readFileSync("public/app.js","utf8");
  assert.match(app,/aria-activedescendant/);
  assert.match(app,/role","option"/);
  assert.match(app,/aria-selected/);
  assert.match(app,/event\.key==="ArrowDown"/);
  assert.match(app,/event\.key==="ArrowUp"/);
  assert.match(app,/event\.key==="Enter"/);
  assert.match(app,/event\.key==="Escape"/);
  assert.match(app,/active\.scrollIntoView\(\{block:"nearest"\}\)/);
});
