import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("PWA-Quelle trennt Offline-Cache von Konto- und Alarmdaten", () => {
  const build = fs.readFileSync("scripts/build.mjs", "utf8");
  const sw = fs.readFileSync("public/sw.js", "utf8");
  const validate = fs.readFileSync("scripts/validate-build.mjs", "utf8");

  assert.match(build, /manifest\.webmanifest/);
  assert.match(build, /display:"standalone"/);
  assert.match(build, /theme_color:"#10152a"/);
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
