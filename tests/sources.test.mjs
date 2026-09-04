import test from "node:test";
import assert from "node:assert/strict";
import { fetchDirectOffers } from "../scripts/lib/direct.mjs";
import { fetchImpactOffers } from "../scripts/lib/impact.mjs";

test("direkte Partner liefern nur aktivierte HTTPS-Angebote", async () => {
  const rows = await fetchDirectOffers();
  assert.equal(rows.length, 3);
  assert.ok(rows.every(r => r.source === "direct" && r.urlTracking.startsWith("https://")));
});
test("Impact bleibt ohne Zugangsdaten deaktiviert", async () => assert.deepEqual(await fetchImpactOffers({}), []));
test("Impact nutzt Media-Partner-API und Basic Auth", async () => {
  let call;
  const fetchImpl = async (url, options) => { call={url,options}; return {ok:true,json:async()=>({Promotions:[],"@numpages":1})}; };
  await fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl});
  assert.match(call.url,/\/Mediapartners\/SID\/Promotions/);
  assert.match(call.options.headers.Authorization,/^Basic /);
});
