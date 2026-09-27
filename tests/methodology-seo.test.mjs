import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Methodik-Seite ist indexierbar, in der Sitemap und aus Deal-Checks verlinkt", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://example.test/angebotslotse" }
  });

  const html = fs.readFileSync("dist/methodik.html", "utf8");
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
  const offerFile = fs.readdirSync("dist/angebote").find(name => name.endsWith(".html"));
  const offer = fs.readFileSync("dist/angebote/" + offerFile, "utf8");

  assert.match(html, /So prüft Angebotslotse Deals/);
  assert.match(html, /gespeicherte Preismesspunkte/);
  assert.match(html, /Affiliate-Provision ist keine Qualitätsnote/);
  assert.match(html, /content="index,follow,max-image-preview:large"/);
  assert.match(html, /"@type":"WebPage"/);
  assert.match(sitemap, /\/methodik\.html/);
  assert.match(offer, /\/methodik\.html/);
  assert.match(offer, /So prüfen wir Deals/);
});
