import test from "node:test";
import assert from "node:assert/strict";
import { collectSources, runSourceWithRetry } from "../scripts/lib/source-manager.mjs";

test("fehlende Secrets deaktivieren nur die betroffenen Quellen und legen keine Werte offen", async () => {
  const { sources } = await collectSources({});
  const byName = Object.fromEntries(sources.map(source => [source.name, source]));
  assert.equal(byName.direct.state, "ok");
  assert.equal(byName.awin.state, "disabled");
  assert.match(byName.awin.audit.reason, /AWIN_PUBLISHER_ID.*AWIN_API_TOKEN.*missing/);
  assert.match(byName.impact.audit.reason, /IMPACT_ACCOUNT_SID.*IMPACT_AUTH_TOKEN.*missing/);
  assert.match(byName.amazon.audit.reason, /AMAZON_CREATORS_CREDENTIAL_ID.*AMAZON_CREATORS_CREDENTIAL_SECRET.*AMAZON_PARTNER_TAG.*missing/);
  assert.match(byName["awin-product-feeds"].audit.reason, /AWIN_DATAFEED_API_KEY missing/);
  assert.match(byName.daisycon.audit.reason, /DAISYCON_PUBLISHER_ID \/ DAISYCON_ACCESS_TOKEN missing/);
  assert.match(byName.tradedoubler.audit.reason, /TRADEDOUBLER_PRODUCTS_TOKEN \/ TRADEDOUBLER_FEED_URLS missing/);
  assert.match(byName["tradedoubler-vouchers"].audit.reason, /TRADEDOUBLER_VOUCHERS_TOKEN missing/);
  assert.match(byName.webgains.audit.reason, /WEBGAINS_FEED_URLS missing/);
  assert.doesNotMatch(JSON.stringify(sources), /token_value|SID_VALUE|credential_secret_value|supersecret123/i);
});


test("temporäre Quellenfehler werden begrenzt erneut versucht", async () => {
  let calls = 0;
  const waits = [];
  const result = await runSourceWithRetry(async () => {
    calls += 1;
    if (calls === 1) throw new Error("fetch failed: ETIMEDOUT");
    return ["ok"];
  }, { attempts: 2, baseDelayMs: 25, sleep: async ms => waits.push(ms) });
  assert.deepEqual(result, ["ok"]);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [25]);
});

test("dauerhafte Konfigurationsfehler werden nicht blind erneut versucht", async () => {
  let calls = 0;
  await assert.rejects(
    () => runSourceWithRetry(async () => { calls += 1; throw new Error("credentials missing"); }, { attempts: 3, sleep: async () => {} }),
    /credentials missing/
  );
  assert.equal(calls, 1);
});

test("HTTP 501 gilt nicht als transienter Retry-Fehler", async () => {
  let calls = 0;
  await assert.rejects(
    () => runSourceWithRetry(async () => { calls += 1; const error = new Error("HTTP 501"); error.status = 501; throw error; }, { attempts: 3, sleep: async () => {} }),
    /HTTP 501/
  );
  assert.equal(calls, 1);
});

test("Impact kann zwischen 4h-Website-Updates rate-limit-schonend ausgesetzt werden", async () => {
  const { sources } = await collectSources({
    IMPACT_ACCOUNT_SID: "SID_VALUE",
    IMPACT_AUTH_TOKEN: "token_value",
    IMPACT_SYNC_EVERY_HOURS: "12",
    SOURCE_SYNC_UTC_HOUR: "4"
  });
  const impact = sources.find(source => source.name === "impact");
  assert.equal(impact.state, "disabled");
  assert.equal(impact.rows.length, 0);
  assert.equal(impact.audit.cadenceHours, 12);
  assert.match(impact.audit.reason, /rate-limit cooldown/i);
});
