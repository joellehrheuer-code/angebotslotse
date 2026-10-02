import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("V9 primary navigation exposes comfortable touch targets", () => {
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse",
      CONTACT_EMAIL: "joellehrheuer@gmail.com",
      LEGAL_NAME: "Joel Leroy Lehrheuer",
      LEGAL_ADDRESS: "Rathausstraße 4, 52072 Aachen, Deutschland",
    },
    stdio: "ignore",
  });
  const css = fs.readFileSync("dist/enhancements.css", "utf8");
  const html = fs.readFileSync("dist/index.html", "utf8");
  assert.match(css, /V9 touch-target hardening/);
  assert.match(css, /\.header-links a\{[\s\S]*?min-height:44px/);
  assert.match(css, /\.header-social a\{[\s\S]*?width:44px!important;[\s\S]*?height:44px!important/);
  assert.match(css, /\.search-chips a\{[\s\S]*?min-height:44px/);
  assert.match(css, /\.section-head>a,\.rail-actions>a\{[\s\S]*?min-height:44px/);
  assert.match(css, /\.nav-panel a\{[\s\S]*?min-height:44px/);
  assert.match(html, /site\.css\?v=\d+/);
});
