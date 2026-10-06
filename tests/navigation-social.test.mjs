import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Header nutzt echte lokale Social-PNGs und mobile Hamburger-Suche", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });

  const html = fs.readFileSync("dist/index.html", "utf8");
  const app = fs.readFileSync("dist/app.js", "utf8");
  for (const name of ["instagram","tiktok","youtube","twitch","spotify","snapchat","discord"]) {
    const file = "dist/social/" + name + ".png";
    assert.ok(fs.existsSync(file), "Fehlendes Social-Icon: " + name);
    assert.ok(fs.statSync(file).size > 500, "Social-Icon ist verdächtig klein: " + name);
    assert.ok(html.includes("/social/" + name + ".png"));
  }
  assert.ok(fs.existsSync("dist/social/facebook.svg"), "Fehlendes Facebook-Icon");
  assert.match(html, /social\/facebook\.svg/);
  assert.match(html, /facebook\.com\/reel\//);
  assert.match(html, /class="[^"]*top-social-links[^"]*"/);
  assert.match(html, /data-live-sort="deals"/);
  assert.match(html, /data-live-sort="az"/);
  assert.match(html, /class="brand-logo"[^>]+joel-logo\.svg\?v=4/);
  assert.match(html, /creator-profile-image/);
  assert.match(html, /class="creator-social-grid"/);
  assert.match(html, /class="creator-top-dock"/);
  assert.match(html, /class="owned-showcase/);
  assert.match(html, /joel-logo\.svg/);
  assert.match(html, /creator-platform-links/);
  assert.match(html, /Musik & Streams/);
  assert.match(html, /J0JOEL – Musik/);
  assert.match(html, /Joel271997 – Streams/);
  assert.match(html, /class="mobile-nav-search"/);
  assert.match(html, /tiktok\.com\/@joel\.27\.1997/);
  assert.match(html, /snapchat\.com\/add\//);
  assert.match(html, /discord\.gg\//);
  assert.match(html, /data-fallback-src=/);
  assert.match(app, /fallbackUsed/);
  assert.match(app, /document\.body\.classList\.add\("menu-open"\)/);
  assert.match(app, /Klick|closeMenu|Menü schließen/);
});
