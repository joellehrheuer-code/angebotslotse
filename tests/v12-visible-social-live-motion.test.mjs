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

test("V12.6 hält Socials oben sichtbar und unabhängig vom alten Header-Breakpoint",()=>{
  build();
  const html=fs.readFileSync("dist/index.html","utf8");
  const css=fs.readFileSync("public/enhancements.css","utf8");
  for(const platform of ["Instagram","TikTok","YouTube","Facebook","Twitch","Snapchat","Spotify","Discord"]){
    assert.match(html,new RegExp(`aria-label="${platform}"`),`Social-Link fehlt oben: ${platform}`);
  }
  assert.match(html,/class="[^"]*top-social-links[^"]*"/);
  assert.match(css,/\.top-social-links\{[\s\S]*?display:flex!important/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.top-social-links\{[\s\S]*?display:flex!important/);
});

test("V12.6 Live-Bereich sortiert Shop-Karten animiert",()=>{
  build();
  const html=fs.readFileSync("dist/index.html","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const css=fs.readFileSync("public/enhancements.css","utf8");
  assert.match(html,/data-live-network/);
  assert.match(html,/data-live-sort="deals"/);
  assert.match(html,/data-live-sort="az"/);
  assert.match(html,/data-live-store-list/);
  assert.match(html,/data-store-count=/);
  assert.match(app,/sortLiveStores/);
  assert.match(app,/getBoundingClientRect/);
  assert.match(app,/Element\.prototype\.animate/);
  assert.match(css,/@keyframes live-stat-enter/);
  assert.match(css,/@keyframes live-network-sweep/);
});

test("V12.6 erzwingt frische Assets und PWA-Cache-Version",()=>{
  build();
  const html=fs.readFileSync("dist/index.html","utf8");
  const sw=fs.readFileSync("public/sw.js","utf8");
  assert.match(html,/site\.css\?v=45/);
  assert.match(html,/app\.js\?v=23/);
  assert.match(sw,/angebotslotse-shell-v17/);
});
