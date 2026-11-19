import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

test("creator profile image has a real, bundled media fallback",()=>{
  execFileSync(process.execPath,["scripts/build-account-client.mjs"],{stdio:"pipe"});
  execFileSync(process.execPath,["scripts/build.mjs"],{
    stdio:"pipe",
    env:{...process.env,SITE_URL:"https://joellehrheuer-code.github.io/angebotslotse"}
  });
  const html=fs.readFileSync("dist/index.html","utf8");
  const tag=html.match(/<img class="creator-logo-art creator-profile-image"[^>]+>/)?.[0];
  assert.ok(tag);
  assert.ok(tag.includes("data-media"));
  assert.ok(tag.includes("data-fallback-src="));
  assert.ok(tag.includes("/og.png"));
  assert.ok(fs.existsSync("dist/og.png"));
});
