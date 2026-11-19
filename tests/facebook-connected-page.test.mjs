import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

test("connected Facebook page appears exactly once in the header and creator social links", () => {
  const creators=JSON.parse(fs.readFileSync("data/creators.json","utf8"));
  const facebook=creators.entries.filter(entry=>entry.name.toLowerCase()==="facebook");
  assert.equal(facebook.length,1);
  assert.equal(facebook[0].url,"https://www.facebook.com/1256178084247228");
  execFileSync(process.execPath,["scripts/build-account-client.mjs"],{stdio:"pipe"});
  execFileSync(process.execPath,["scripts/build.mjs"],{
    stdio:"pipe",
    env:{...process.env,SITE_URL:"https://joellehrheuer-code.github.io/angebotslotse"}
  });
  const html=fs.readFileSync("dist/index.html","utf8");
  assert.ok(html.includes('aria-label="Facebook"'));
  assert.ok(html.includes('href="https://www.facebook.com/1256178084247228"'));
  assert.ok(html.includes("/social/facebook.svg"));
});
