import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const build=()=>{
  execFileSync(process.execPath,["scripts/build-account-client.mjs"],{stdio:"pipe"});
  execFileSync(process.execPath,["scripts/build.mjs"],{
    stdio:"pipe",
    env:{...process.env,SITE_URL:"https://joellehrheuer-code.github.io/angebotslotse"}
  });
};

test("V13 trennt Angebotslotse-Marke und Joel-Creator-Welt sauber",()=>{
  build();
  const html=fs.readFileSync("dist/index.html","utf8");
  assert.match(html,/class="brand-logo"[^>]+favicon\.svg/);
  assert.doesNotMatch(html,/class="brand-logo"[^>]+joel-logo\.svg/);
  assert.match(html,/class="creator-top-dock"/);
  assert.match(html,/class="creator-world reveal"/);
  assert.match(html,/class="creator-world-backdrop"/);
  assert.match(html,/creator-profile-image/);
  assert.match(html,/joel-logo\.svg/);
});

test("V13 hält Socials, Videos und eigene Projekte sichtbar",()=>{
  build();
  const html=fs.readFileSync("dist/index.html","utf8");
  for(const platform of ["Instagram","TikTok","YouTube","Facebook","Twitch","Snapchat","Spotify","Discord"]){
    assert.match(html,new RegExp(`aria-label="${platform}"|>${platform}<`),`Plattform fehlt: ${platform}`);
  }
  assert.match(html,/id="neueste-videos"/);
  assert.match(html,/class="creator-video-grid/);
  assert.match(html,/id="eigene-projekte"/);
  assert.match(html,/Von Liebe bis zur tiefsten Trauer/);
  assert.match(html,/Dinge über Beziehungen/);
  assert.match(html,/Merch-Shop öffnen/);
});

test("V13 nutzt eigene Designschicht und frische Cache-Version",()=>{
  build();
  const html=fs.readFileSync("dist/index.html","utf8");
  const css=fs.readFileSync("public/v13.css","utf8");
  const sw=fs.readFileSync("public/sw.js","utf8");
  assert.match(html,/site\.css\?v=31/);
  assert.match(css,/\.creator-top-dock\{/);
  assert.match(css,/\.creator-world\{/);
  assert.match(css,/\.owned-showcase\{/);
  assert.match(css,/\.deal-rail\{/);
  assert.match(sw,/angebotslotse-shell-v15/);
});
