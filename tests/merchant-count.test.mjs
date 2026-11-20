import test from "node:test";
import assert from "node:assert/strict";
import { countDistinctMerchants } from "../scripts/lib/merchant-count.mjs";

test("merchant count deduplicates offers from the same shop", () => {
  const primary = { advertiser: "Belkin" };
  const alternatives = [{ advertiser: "Belkin" }, { advertiser: " BELKIN " }, { advertiser: "Other Shop" }];
  assert.equal(countDistinctMerchants(primary, alternatives), 2);
});

test("merchant count ignores unlabelled shops and retains a genuine second merchant", () => {
  assert.equal(countDistinctMerchants({ advertiser: "Shop A" }, [{}, { advertiser: "Shop B" }]), 2);
  assert.equal(countDistinctMerchants({ advertiser: "Shop A" }, [{ advertiser: "Shop A" }]), 1);
  assert.equal(countDistinctMerchants({ advertiser: "" }, [{ advertiser: "  " }]), 0);
});
