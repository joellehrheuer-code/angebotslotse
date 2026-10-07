import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Konto erklärt Erstellung und Rückkehr eindeutig", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const src=fs.readFileSync("src/account-client.js","utf8");

  assert.match(build,/data-account-hero-title>Dein Angebotslotse-Konto\./);
  assert.match(build,/Konto erstellen oder anmelden/);
  assert.match(build,/Beim ersten Mal wird dein Konto erstellt/);
  assert.match(build,/Weiter per E-Mail/);
  assert.match(build,/account-client\.js\?v=4/);

  assert.match(src,/accountHeroTitle/);
  assert.match(src,/Dein Angebotslotse-Konto\./);
  assert.match(src,/Schön, dass du wieder da bist\./);
  assert.match(src,/zwischen deinen Geräten synchronisiert/);
});
