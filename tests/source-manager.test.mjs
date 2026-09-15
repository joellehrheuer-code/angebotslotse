import test from "node:test";
import assert from "node:assert/strict";
import { collectSources } from "../scripts/lib/source-manager.mjs";

test("fehlende Secrets deaktivieren nur die betroffenen Quellen und legen keine Werte offen", async () => {
  const { sources } = await collectSources({});
  const byName = Object.fromEntries(sources.map(source => [source.name, source]));
  assert.equal(byName.direct.state, "ok");
  assert.equal(byName.awin.state, "disabled");
  assert.match(byName.awin.audit.reason, /AWIN_PUBLISHER_ID.*AWIN_API_TOKEN.*missing/);
  assert.match(byName.impact.audit.reason, /IMPACT_ACCOUNT_SID.*IMPACT_AUTH_TOKEN.*missing/);
  assert.match(byName["awin-product-feeds"].audit.reason, /AWIN_DATAFEED_API_KEY missing/);
  assert.doesNotMatch(JSON.stringify(sources), /secret|token_value|SID_VALUE/i);
});
