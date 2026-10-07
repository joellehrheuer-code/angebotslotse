import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Konto erklärt Erstellung und Rückkehr eindeutig", () => {
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  const src=fs.readFileSync("src/account-client.js","utf8");

  assert.match(build,/data-account-hero-title>Willkommen bei Angebotslotse\./);
  assert.match(build,/Konto erstellen oder anmelden/);
  assert.match(build,/Beim ersten Mal wird dein Konto erstellt/);
  assert.match(build,/Weiter per E-Mail/);
  assert.match(build,/account-client\.js\?v=4/);

  assert.match(src,/accountHeroTitle/);
  assert.match(src,/Willkommen bei Angebotslotse\./);
  assert.match(src,/Willkommen zurück\./);
  assert.match(src,/geräteübergreifend/);
});
