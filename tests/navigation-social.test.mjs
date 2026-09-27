import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Header nutzt echte lokale Social-PNGs und mobile Hamburger-Suche", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://example.test/angebotslotse" }
  });

  const html = fs.readFileSync("dist/index.html", "utf8");
  const app = fs.readFileSync("dist/app.js", "utf8");
  for (const name of ["instagram","youtube","twitch","spotify","snapchat","discord"]) {
    const file = "dist/social/" + name + ".png";
    assert.ok(fs.existsSync(file), "Fehlendes Social-Icon: " + name);
    assert.ok(fs.statSync(file).size > 500, "Social-Icon ist verdächtig klein: " + name);
    assert.ok(html.includes("/social/" + name + ".png"));
  }
  assert.match(html, /class="mobile-nav-search"/);
  assert.match(html, /snapchat\.com\/add\//);
  assert.match(html, /discord\.gg\//);
  assert.match(app, /document\.body\.classList\.add\("menu-open"\)/);
  assert.match(app, /Klick|closeMenu|Menü schließen/);
});
