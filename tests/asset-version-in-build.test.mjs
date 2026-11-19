import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("build resolves CSS and browser-JS cache versions rather than outputting literal placeholders", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });
  const html=fs.readFileSync("dist/index.html","utf8");
  assert.equal(html.includes("${assetVersion}"),false);
  assert.match(html,new RegExp("site[.]css[?]v=55-[0-9]+"));
  assert.match(html,new RegExp("app[.]js[?]v=28-[0-9]+"));
});
