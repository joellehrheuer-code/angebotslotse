import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("V9 mobile navigation and skip link are built safely", () => {
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
  const html = fs.readFileSync("dist/index.html", "utf8");
  const css = fs.readFileSync("dist/enhancements.css", "utf8");
  assert.match(html, /class="skip-link"/);
  assert.match(html, /id="main-content"/);
  assert.match(html, /class="mobile-bottom-nav"/);
  assert.match(html, />Vergleiche</);
  assert.match(html, />Merkliste</);
  assert.match(css, /\.mobile-bottom-nav/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
