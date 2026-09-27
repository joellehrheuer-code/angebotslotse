import test from "node:test";
import assert from "node:assert/strict";
import { matchAlertSubscription, savedOfferEvents, buildNotificationCandidates } from "../scripts/lib/alert-matcher.mjs";

test("Wunschpreis löst erst beim Erreichen aus", () => {
  const saved={user_id:"u1",offer_slug:"gpu",target_price:499,alert_on_target:true};
  const previous={slug:"gpu",currentPrice:549,available:true};
  const current={id:"o1",slug:"gpu",currentPrice:489,available:true};
  const events=savedOfferEvents(saved,current,previous);
  assert.deepEqual(events.map(e=>e.type),["target-price"]);
  assert.equal(savedOfferEvents(saved,{...current,currentPrice:520},previous).length,0);
});

test("Preissturz und Wiederverfügbarkeit werden getrennt erkannt", () => {
  const saved={alert_on_price_drop:true,alert_on_restock:true};
  const events=savedOfferEvents(saved,{currentPrice:89,available:true},{currentPrice:99,available:false});
  assert.deepEqual(events.map(e=>e.type).sort(),["price-drop","restock"]);
});

test("Kategorie-, Marken-, Händler- und Suchalarme beachten Preis und Rabatt", () => {
  const offer={id:"x",slug:"x",title:"Gaming Monitor 27 Zoll",description:"OLED",category:"computer",brand:"AOC",advertiser:"Coolblue",currentPrice:399,previousPrice:499};
  assert.equal(matchAlertSubscription({enabled:true,alert_type:"category",category:"computer",max_price:450},offer),true);
  assert.equal(matchAlertSubscription({enabled:true,alert_type:"brand",brand:"AOC",min_discount:15},offer),true);
  assert.equal(matchAlertSubscription({enabled:true,alert_type:"merchant",merchant:"Coolblue"},offer),true);
  assert.equal(matchAlertSubscription({enabled:true,alert_type:"search",query:"oled"},offer),true);
  assert.equal(matchAlertSubscription({enabled:true,alert_type:"brand",brand:"AOC",max_price:300},offer),false);
});

test("Batch-Kandidaten erhalten stabile Dedupe-Keys", () => {
  const input={
    offers:[{id:"o1",slug:"gpu",title:"RTX Angebot",category:"computer",brand:"NVIDIA",advertiser:"Shop",currentPrice:489,previousPrice:549}],
    previousOffers:[{id:"o1",slug:"gpu",currentPrice:549}],
    savedOffers:[{user_id:"u1",offer_slug:"gpu",target_price:499,alert_on_target:true}],
    subscriptions:[{id:"s1",user_id:"u1",enabled:true,alert_type:"brand",brand:"NVIDIA",max_price:500}]
  };
  const first=buildNotificationCandidates(input);
  const second=buildNotificationCandidates(input);
  assert.equal(first.length,2);
  assert.deepEqual(first.map(x=>x.dedupeKey),second.map(x=>x.dedupeKey));
  assert.equal(new Set(first.map(x=>x.dedupeKey)).size,2);
});
