import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("Marken-Hubs entstehen nur mit ausreichendem echtem Angebotsbestand", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://example.test/angebotslotse" }
  });

  const index = fs.readFileSync("dist/marken.html","utf8");
  const sitemap = fs.readFileSync("dist/sitemap.xml","utf8");
  const report = JSON.parse(fs.readFileSync("dist/build-report.json","utf8"));
  const dir = "dist/marken";
  const files = fs.readdirSync(dir).filter(name => name.endsWith(".html"));

  assert.equal(files.length, report.brandPages);
  assert.ok(files.length > 0);
  assert.match(index, /<h1>Marken<\/h1>/);
  assert.match(index, /mindestens fünf veröffentlichungsfähigen Angeboten/);
  assert.match(sitemap, /\/marken\.html/);

  for (const file of files) {
    const html = fs.readFileSync(path.join(dir,file),"utf8");
    const cards = [...html.matchAll(/class="deal-card\b/g)].length;
    assert.ok(cards >= 5, `${file} hat nur ${cards} Deal-Karten`);
    assert.doesNotMatch(html, /content="noindex,follow"/);
    assert.match(html, /Datencheck zu/);
    assert.match(index, new RegExp("/marken/" + file.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&")));
    assert.match(sitemap, new RegExp("/marken/" + file.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&")));
  }
});
