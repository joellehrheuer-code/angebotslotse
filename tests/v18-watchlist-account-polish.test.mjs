import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("V18 vereinheitlicht Merkliste und Konto-Oberfläche", () => {
  const css=fs.readFileSync("public/v13.css","utf8");
  const build=fs.readFileSync("scripts/build.mjs","utf8");

  assert.match(css,/V18 WATCHLIST \+ ACCOUNT POLISH/);
  assert.match(css,/\.watchlist-grid\{/);
  assert.match(css,/\.watchlist-item\{/);
  assert.match(css,/\.account-grid\{/);
  assert.match(css,/\.account-alert-form\{/);
  assert.match(css,/\.account-cashback-summary\{/);
  assert.match(css,/\.account-security-card\{/);

  assert.match(build,/class="listing account-page"/);
  assert.match(build,/data-account-alerts-card/);
  assert.match(build,/data-account-push-card/);
  assert.match(build,/data-account-cashback-card/);
  assert.match(build,/site\.css\?v=\d+/);
});
