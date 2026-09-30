import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeAwinTransaction, buildCashbackClaim, claimStatusForNetworkStatus } from "../scripts/lib/cashback.mjs";

test("Awin-Transaktion wird auf Cashback-Minimum reduziert",()=>{
  const tx=normalizeAwinTransaction({
    id:123,advertiserId:125144,advertiserName:"ANTHBOT DE",commissionStatus:"approved",
    commissionAmount:{amount:10,currency:"EUR"},saleAmount:{amount:100,currency:"EUR"},
    clickRefs:{clickRef:"cb_abc"},orderRef:"PRIVATE-ORDER",customerCountry:"DE",ipHash:"secretish",
    transactionDate:"2026-09-30T00:00:00Z",type:"Sale"
  });
  assert.equal(tx.external_transaction_id,"123");
  assert.equal(tx.merchant_key,"awin:125144");
  assert.equal(tx.click_ref,"cb_abc");
  assert.equal(tx.raw_payload.advertiserName,"ANTHBOT DE");
  assert.equal("orderRef" in tx.raw_payload,false);
  assert.equal("ipHash" in tx.raw_payload,false);
});

test("Cashback-Claim entsteht nur bei allowed + passendem ClickRef",()=>{
  const transaction={external_transaction_id:"123",merchant_key:"awin:125144",click_ref:"cb_abc",commission_amount:10,order_amount:100,currency:"EUR",transaction_status:"approved",occurred_at:"2026-09-30T00:00:00.000Z"};
  const token={token:"cb_abc",user_id:"00000000-0000-0000-0000-000000000001"};
  assert.equal(buildCashbackClaim({transaction,clickToken:token,program:{eligibility:"review",commission_share_bps:5000}}),null);
  assert.equal(buildCashbackClaim({transaction,clickToken:{...token,token:"wrong"},program:{eligibility:"allowed",commission_share_bps:5000}}),null);
  const claim=buildCashbackClaim({transaction,clickToken:token,program:{eligibility:"allowed",commission_share_bps:5000}});
  assert.equal(claim.cashback_amount,5);
  assert.equal(claim.claim_status,"confirmed");
  assert.equal(claim.user_id,token.user_id);
});

test("Netzwerkstatus wird fail-closed auf pending gemappt",()=>{
  assert.equal(claimStatusForNetworkStatus("approved"),"confirmed");
  assert.equal(claimStatusForNetworkStatus("declined"),"rejected");
  assert.equal(claimStatusForNetworkStatus("deleted"),"rejected");
  assert.equal(claimStatusForNetworkStatus("unknown"),"pending");
});

test("Cashback-Sync ist server-only und ohne Secret ein No-op",()=>{
  const source=fs.readFileSync("scripts/cashback-sync.mjs","utf8");
  assert.match(source,/SUPABASE_SECRET_KEY/);
  assert.match(source,/Cashback-Sync deaktiviert/);
  assert.doesNotMatch(fs.readFileSync("src/account-client.js","utf8"),/SUPABASE_SECRET_KEY/);
});
