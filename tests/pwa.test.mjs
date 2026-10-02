import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("PWA-Quelle trennt Offline-Cache von Konto- und Alarmdaten", () => {
  const build = fs.readFileSync("scripts/build.mjs", "utf8");
  const sw = fs.readFileSync("public/sw.js", "utf8");
  const validate = fs.readFileSync("scripts/validate-build.mjs", "utf8");

  assert.match(build, /manifest\.webmanifest/);
  assert.match(build, /display:"standalone"/);
  assert.match(build, /theme_color:"#0d5f49"/);
  assert.match(build, /serviceWorker/);
  assert.match(build, /offline\.html/);
  assert.match(validate, /manifest\.webmanifest/);
  assert.match(validate, /sw\.js/);
  assert.match(validate, /offline\.html/);
  assert.match(sw, /konto\.html/);
  assert.match(sw, /alerts-feed\.json/);
  assert.match(sw, /site\.css/);
  assert.doesNotMatch(sw, /local\("styles\.css"\)|local\("enhancements\.css"\)/);
  assert.doesNotMatch(sw, /SUPABASE_SECRET_KEY|RESEND_API_KEY|service_role/);
});

test("PWA-App-Icons sind echte PNGs mit Store-tauglichen Größen", () => {
  const expected = [
    ["public/app-icon-192.png", 192, 192],
    ["public/app-icon-512.png", 512, 512],
    ["public/app-icon-maskable-512.png", 512, 512],
    ["public/apple-touch-icon.png", 180, 180]
  ];
  for (const [file,width,height] of expected) {
    const data = fs.readFileSync(file);
    assert.equal(data.subarray(0,8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(data.readUInt32BE(16), width);
    assert.equal(data.readUInt32BE(20), height);
  }
  const build = fs.readFileSync("scripts/build.mjs", "utf8");
  assert.match(build, /apple-touch-icon\.png/);
  assert.match(build, /app-icon-192\.png/);
  assert.match(build, /app-icon-512\.png/);
  assert.match(build, /app-icon-maskable-512\.png/);
  assert.match(build, /purpose:"maskable"/);
});

test("Startseite bietet einen gerätegerechten PWA-Installationsweg", () => {
  const build = fs.readFileSync("scripts/build.mjs", "utf8");
  const app = fs.readFileSync("public/app.js", "utf8");
  assert.match(build, /data-app-install/);
  assert.match(app, /beforeinstallprompt/);
  assert.match(app, /appinstalled/);
  assert.match(app, /navigator\.standalone/);
  assert.match(app, /Zum Home-Bildschirm/);
});
