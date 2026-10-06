import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Header und Browser-Tab nutzen das bestätigte Angebotslotse-Branding", () => {
  const build = fs.readFileSync("scripts/build.mjs", "utf8");

  assert.match(build, /brand-name">Angebotslotse/);
  assert.match(build, /Joel271997 \/ J0JOEL/);
  assert.match(build, /joel-logo\.svg\?v=3/);
  assert.doesNotMatch(build, /<link rel="icon" href="\$\{url\("\/favicon\.svg"\)\}"/);
});
