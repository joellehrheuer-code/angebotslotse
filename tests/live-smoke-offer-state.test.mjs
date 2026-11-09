import test from "node:test";
import assert from "node:assert/strict";
import { validatePublishedOffersState } from "../scripts/lib/live-smoke-offer-state.mjs";
const goodHome = '<main><h1>Angebote finden</h1><p>keine aktuell verifizierten Produktangebote</p></main>';
const degradedStatus = '<div class="status degraded">Aktualisierung eingeschränkt</div>';
test("smoke accepts positive verified offer inventory", () => {
  assert.deepEqual(validatePublishedOffersState({report:{offers:4},statusHtml:"",homeHtml:""}),[]);
});
test("smoke accepts empty inventory only with degraded status and honest accessible home", () => {
  assert.deepEqual(validatePublishedOffersState({report:{offers:0},statusHtml:degradedStatus,homeHtml:goodHome}),[]);
});
test("smoke rejects empty inventory without degraded status", () => {
  assert.match(validatePublishedOffersState({report:{offers:0},statusHtml:'<div class="status ok">ok</div>',homeHtml:goodHome}).join(" "),/nicht als degraded/);
});
test("smoke rejects empty inventory without visible disclosure or valid H1", () => {
  assert.equal(validatePublishedOffersState({report:{offers:0},statusHtml:degradedStatus,homeHtml:"<main></main>"}).length,2);
});
test("smoke rejects negative, fractional and missing offer counts", () => {
  for(const count of [-1,1.5,undefined]) {
    assert.match(validatePublishedOffersState({report:{offers:count},statusHtml:degradedStatus,homeHtml:goodHome}).join(" "),/ungültig/);
  }
});
