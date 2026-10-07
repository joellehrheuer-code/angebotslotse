import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V13 live smoke prüft die aktuelle Produktionsarchitektur",()=>{
  const smoke=fs.readFileSync("scripts/live-smoke.mjs","utf8");
  assert.match(smoke,/site\.css\?v=47/);
  assert.match(smoke,/app\.js\?v=23/);
  assert.match(smoke,/class="top-social-links creator-dock-links"/);
  assert.match(smoke,/class="creator-top-dock"/);
  assert.match(smoke,/class="creator-world reveal"/);
  assert.match(smoke,/id="eigene-projekte"/);
  assert.match(smoke,/id="neueste-videos"/);
  assert.doesNotMatch(smoke,/site\.css\?v=30/);
});
