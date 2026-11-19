import test from "node:test";
import assert from "node:assert/strict";
import { fetchAwinTransactions } from "../scripts/lib/awin.mjs";

test("Awin transactions reject absent publisher ID or PAT without any network call", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, json: async () => [] };
  };
  const base = { publisherId: "3045061", token: "fake-test-token", startDate: "2026-11-01T00:00:00", endDate: "2026-11-02T00:00:00", fetchImpl };
  await assert.rejects(fetchAwinTransactions({ ...base, token: undefined }), /AWIN_PUBLISHER_ID und AWIN_API_TOKEN/);
  await assert.rejects(fetchAwinTransactions({ ...base, publisherId: undefined }), /AWIN_PUBLISHER_ID und AWIN_API_TOKEN/);
  assert.equal(calls, 0, "invalid credentials must never reach the network");
});

test("Awin transactions retain bearer authentication for valid input", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => [{ id: "test-transaction" }] };
  };
  const result = await fetchAwinTransactions({
    publisherId: "3045061", token: "fake-test-token",
    startDate: "2026-11-01T00:00:00", endDate: "2026-11-02T00:00:00", fetchImpl
  });
  assert.equal(result.length, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.headers.Authorization, "Bearer fake-test-token");
  assert.equal(requests[0].url.includes("fake-test-token"), false);
});
