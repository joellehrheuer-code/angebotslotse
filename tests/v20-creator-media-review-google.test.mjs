import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V20 verbindet Creator-Media, Bewertungs-Nudge und Google-Identität", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");
  const smoke=fs.readFileSync("scripts/live-smoke.mjs","utf8");

  assert.match(build,/creator-video-rail/);
  assert.match(build,/data-spotify-player-load/);
  assert.match(build,/data-review-nudge/);
  assert.match(build,/"@type":"Organization"/);
  assert.match(build,/sameAs:officialSameAs/);
  assert.match(build,/site\.css\?v=\d+/);
  assert.match(build,/app\.js\?v=\d+/);

  assert.match(app,/angebotslotse-review-complete-v1/);
  assert.match(app,/angebotslotse-review-dismissed-until-v1/);
  assert.match(app,/setTimeout\(showReviewNudge,75000\)/);
  assert.match(app,/data-spotify-player-load/);
  assert.match(app,/open\.spotify\.com\/embed\/artist/);

  assert.match(css,/V20 CREATOR MEDIA \+ REVIEW NUDGE/);
  assert.match(css,/\.creator-video-rail\{/);
  assert.match(css,/\.review-nudge\{/);

  assert.match(smoke,/cssAsset=homeHtml\.match/);
  assert.match(smoke,/appAsset=homeHtml\.match/);
});
