import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const siteUrl = "https://joellehrheuer-code.github.io/angebotslotse";

test("Test-Build-Cache verwendet dist nur mit passender Output-Signatur", () => {
  const env = { ...process.env, NODE_TEST_CONTEXT: "cache-regression", SITE_URL: siteUrl };
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { env, stdio:"ignore" });
  execFileSync(process.execPath, ["scripts/build.mjs"], { env, stdio:"ignore" });

  const marker = fs.readFileSync("dist/.test-build-signature", "utf8").trim();
  assert.ok(marker.length >= 32);

  fs.writeFileSync("dist/.test-build-signature", "falsche-signatur\n");
  const output = execFileSync(process.execPath, ["scripts/build.mjs"], { env, encoding:"utf8" });
  assert.doesNotMatch(output, /Test-Build unverändert/);

  const html = fs.readFileSync("dist/computer.html", "utf8");
  assert.match(html, /https:\/\/joellehrheuer-code\.github\.io\/angebotslotse\//);
  assert.equal(fs.readFileSync("dist/.test-build-signature", "utf8").trim(), marker);
});
