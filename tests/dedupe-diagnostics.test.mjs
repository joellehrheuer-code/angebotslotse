import test from "node:test";
import assert from "node:assert/strict";
import { buildEnhancedFeedDedupeDiagnostics } from "../scripts/lib/dedupe-diagnostics.mjs";

test("Enhanced-Feed-Diagnose zählt Kollaps und Identifier-Dubletten pro Händler",()=>{
  const rawRows=[
    {id:"enhanced-1-a",advertiserName:"Shop A",gtin:"111",mpn:"M1",brand:"Brand"},
    {id:"enhanced-1-b",advertiserName:"Shop A",gtin:"111",mpn:"M1",brand:"Brand"},
    {id:"enhanced-1-c",advertiserName:"Shop A",gtin:"",mpn:"M1",brand:"Brand"},
    {id:"enhanced-2-a",advertiserName:"Shop B",gtin:"222",mpn:"X",brand:"Other"}
  ];
  const normalizedOffers=[
    {sourceId:"enhanced-1-a",advertiser:"Shop A"},
    {sourceId:"enhanced-1-c",advertiser:"Shop A"},
    {sourceId:"enhanced-2-a",advertiser:"Shop B"}
  ];
  const preNormalizedOffers=[
    {sourceId:"enhanced-1-a",advertiser:"Shop A"},
    {sourceId:"enhanced-1-b",advertiser:"Shop A"},
    {sourceId:"enhanced-1-c",advertiser:"Shop A"},
    {sourceId:"enhanced-2-a",advertiser:"Shop B"}
  ];
  const d=buildEnhancedFeedDedupeDiagnostics({rawRows,preNormalizedOffers,normalizedOffers});
  assert.equal(d.inputRows,4);
  assert.equal(d.normalizedRows,4);
  assert.equal(d.filteredBeforeDedupe,0);
  assert.equal(d.outputOffers,3);
  assert.equal(d.dedupedRows,1);
  assert.equal(d.collapsedRows,1);
  const a=d.byMerchant.find(row=>row.merchant==="Shop A");
  assert.equal(a.inputRows,3);
  assert.equal(a.normalizedRows,3);
  assert.equal(a.filteredBeforeDedupe,0);
  assert.equal(a.outputOffers,2);
  assert.equal(a.dedupedRows,1);
  assert.equal(a.duplicateGtinExtras,1);
  assert.equal(a.duplicateMpnExtras,2);
  assert.equal(a.duplicateSourceIdExtras,0);
});

test("Nicht-Enhanced-Zeilen werden aus der Diagnose ausgeschlossen",()=>{
  const d=buildEnhancedFeedDedupeDiagnostics({
    rawRows:[{id:"promo-1",advertiserName:"Shop"}],
    preNormalizedOffers:[{sourceId:"promo-1",advertiser:"Shop"}],
    normalizedOffers:[{sourceId:"promo-1",advertiser:"Shop"}]
  });
  assert.equal(d.inputRows,0);
  assert.equal(d.outputOffers,0);
});
