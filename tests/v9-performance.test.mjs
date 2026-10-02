import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("production build minifies the delivered CSS and main JavaScript", () => {
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

  const sourceCss = fs.readFileSync("public/styles.css", "utf8") + "\n\n" + fs.readFileSync("public/enhancements.css", "utf8");
  const builtCss = fs.readFileSync("dist/site.css", "utf8");
  const sourceJs = fs.readFileSync("public/app.js", "utf8");
  const builtJs = fs.readFileSync("dist/app.js", "utf8");
  const html = fs.readFileSync("dist/index.html", "utf8");

  assert.ok(builtCss.length < sourceCss.length * 0.8, `Expected minified CSS to be <80% of source; got ${builtCss.length}/${sourceCss.length}`);
  assert.ok(builtJs.length < sourceJs.length * 0.8, `Expected minified JS to be <80% of source; got ${builtJs.length}/${sourceJs.length}`);
  assert.doesNotMatch(builtCss, /V7 final consistency pass/);
  assert.match(builtCss, /\.mobile-bottom-nav/);
  assert.match(builtCss, /\.offer-primary-action/);
  assert.match(builtJs, /serviceWorker/);
  assert.match(html, /site\.css\?v=21/);
  assert.match(html, /app\.js\?v=12/);
});
