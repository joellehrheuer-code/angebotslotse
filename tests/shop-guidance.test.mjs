import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Shopseiten zeigen datenbasierten Mehrwert und Methodik statt Händlerwertung", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });

  const files = fs.readdirSync("dist/shops").filter(name => name.endsWith(".html"));
  assert.ok(files.length > 0);
  const html = fs.readFileSync("dist/shops/" + files[0], "utf8");

  assert.match(html, /class="shop-guide"/);
  assert.match(html, /Was aktuell vorliegt/);
  assert.match(html, /mit Preisverlauf/);
  assert.match(html, /mit belegtem Rabatt/);
  assert.match(html, /mit bestätigtem Code/);
  assert.match(html, /Methodik ansehen/);
  assert.match(html, /Diese Übersicht bewertet den Händler nicht/);
  assert.doesNotMatch(html, /bester Shop|bester Händler|Top-Händler/i);
});
