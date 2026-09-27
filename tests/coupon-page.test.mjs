import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Rabattcode-Seite nennt verifizierte Partnerquellen statt feste Netzwerke", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://example.test/angebotslotse" }
  });

  const html = fs.readFileSync("dist/rabattcodes/index.html", "utf8");
  assert.match(html, /Verifizierte Partnerdaten/);
  assert.doesNotMatch(html, /Geprüfte Awin- und Impact-Daten/);
  assert.match(html, /Nur bestätigte, nicht abgelaufene Codes/);
});
