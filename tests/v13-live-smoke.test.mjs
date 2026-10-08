import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V13 live smoke prüft die aktuelle Produktionsarchitektur",()=>{
  const smoke=fs.readFileSync("scripts/live-smoke.mjs","utf8");
  assert.match(smoke,/cssAsset=homeHtml\.match/);
  assert.match(smoke,/appAsset=homeHtml\.match/);
  assert.match(smoke,/class="top-social-links creator-dock-links"/);
  assert.match(smoke,/class="creator-top-dock"/);
  assert.match(smoke,/class="creator-world reveal"/);
  assert.match(smoke,/id="eigene-projekte"/);
  assert.match(smoke,/id="neueste-videos"/);
  assert.doesNotMatch(smoke,/site\.css\?v=30/);
});
