import test from "node:test";
import assert from "node:assert/strict";
import { probeAwinAuth, tokenFormatFlags } from "../scripts/diagnose-awin-auth.mjs";

test("isolated Awin auth probe tests modern and legacy endpoints without leaking token", async () => {
  const secret = "sensitive-fake-PAT-do-not-log";
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { status: 200 };
  };
  const result = await probeAwinAuth({ token: secret, publisherId: "3045061", fetchImpl });
  assert.equal(result.status, "authenticated");
  assert.deepEqual(result.checks.map(({endpoint,httpStatus})=>[endpoint,httpStatus]), [
    ["modern-partnerships",200],["legacy-programmes",200]
  ]);
  assert.ok(calls[0].url.includes("/public/v1/publishers/3045061/advertisers?limit=1"));
  assert.ok(calls[1].url.includes("/publishers/3045061/programmes?relationship=joined"));
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${secret}`);
  assert.ok(!JSON.stringify(result).includes(secret));
});

test("isolated probe never sends malformed GitHub secret values", async () => {
  for (const raw of [" secret ", "Bearer secret", '"secret"', "secret\nline"]) {
    let requests=0;
    const result = await probeAwinAuth({token:raw,publisherId:"3045061",fetchImpl:async()=>{requests++;throw Error("not expected")}});
    assert.equal(result.status,"secret-format-invalid");
    assert.equal(requests,0);
  }
  assert.equal(tokenFormatFlags("  x  ").outerWhitespace,true);
});

test("isolated probe distinguishes 401 authentication from 403 publisher permissions without response payloads", async () => {
  const statuses = [401,403];
  let requests=0;
  const result=await probeAwinAuth({token:"mock-token",publisherId:"3045061",fetchImpl:async()=>({status:statuses[requests++]})});
  assert.deepEqual(result.checks.map(c=>c.httpStatus),statuses);
  assert.equal(result.status,"not-authenticated");
  assert.equal(result.checks.length,2);
  assert.ok(!JSON.stringify(result).includes("mock-token"));
});

test("isolated Awin probe requires the expected publisher ID format",async()=>{
  let requests=0;
  const result=await probeAwinAuth({token:"secret",publisherId:"bad-id",fetchImpl:async()=>{requests++;return {status:200}}});
  assert.equal(result.status,"configuration-missing");
  assert.equal(requests,0);
});
