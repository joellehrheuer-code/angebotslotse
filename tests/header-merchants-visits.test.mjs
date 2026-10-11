import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("header distinguishes every active merchant from merchants with their own shop pages",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(build,/offersByMerchant\.size\} Händler mit Angeboten/);
  assert.match(build,/shopGroups=\[\.\.\.offersByMerchant\.entries\(\)\]\.filter/);
});
test("visitor counter has an accessible loading label, not a misleading minus sign",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(build,/aria-label="Seitenaufrufe werden geladen"/);
  assert.match(build,/data-community-visits>Lädt …/);
  assert.match(build,/data-community-visits-wrap/);
});
