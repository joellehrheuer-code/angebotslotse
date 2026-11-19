import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("merchant selection is available with one confirmed merchant, without inventing choices", () => {
  const source=fs.readFileSync("scripts/build.mjs","utf8");
  const control=source.split("const listingControlsFor=")[1]?.split("for(const category of categories)")[0];
  assert.ok(control,"listing controls must exist");
  assert.ok(control.includes('merchants.length>0?'),"one actual merchant must keep its filter");
  assert.ok(control.includes('rows.map(o=>o.advertiser).filter(Boolean)'),"merchant choices must come from actual approved offers");
  assert.ok(control.includes('data-filter-merchant'),"merchant filter attribute required");
  assert.equal(control.includes('merchants.length>1?'),false,"single real merchant must not hide the filter");
});
