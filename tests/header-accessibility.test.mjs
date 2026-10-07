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

test("Header bleibt an Desktop-, Tablet- und Mobile-Breakpoints zugänglich", () => {
  const css=fs.readFileSync("public/v13.css","utf8");
  assert.match(css, /@media\(min-width:1221px\)/);
  assert.match(css, /@media\(min-width:981px\) and \(max-width:1220px\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /\.header-utility-link\{[\s\S]*?min-height:40px/);
  assert.match(css, /\.menu-toggle\{[\s\S]*?min-height:42px/);
  assert.match(css, /\.hero-search-form>button\{[\s\S]*?min-height:44px/);
  assert.match(css, /\.global-search\{[\s\S]*?grid-template-columns:auto minmax\(0,1fr\) auto/);
});

test("Header bleibt bei Reduced Motion, Netzproblemen und fehlendem ResizeObserver robust", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");

  assert.match(build,/id="quick-search-data"/);
  assert.match(app,/JSON\.parse\(quickSearchDataNode\?\.textContent\|\|"\{\}"\)/);
  assert.match(app,/typeof ResizeObserver !== "undefined"/);
  assert.match(app,/addEventListener\("resize", syncHeaderGeometry\)/);
  assert.match(app,/prefers-reduced-motion: reduce/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
