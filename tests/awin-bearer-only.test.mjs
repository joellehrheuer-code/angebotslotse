import test from "node:test";
import assert from "node:assert/strict";
import {fetchAwinOffers,fetchAwinPrograms,fetchAwinProgramDetails,fetchAwinTransactions} from "../scripts/lib/awin.mjs";

test("all Awin API requests authenticate only with Bearer header, never URL or body token", async () => {
  const token="SECRET_TOKEN_MUST_STAY_PRIVATE";
  const calls=[];
  const fetchImpl=async (uri,options={})=>{
    const url=String(uri);
    const headers=options.headers||{};
    assert.equal(headers.Authorization,`Bearer ${token}`);
    assert.equal(url.includes(token),false,"Awin token must never be in URL");
    assert.equal(url.includes("accessToken="),false,"legacy accessToken query is forbidden");
    assert.equal(String(options.body||"").includes(token),false,"Awin token must never be in request body");
    assert.ok(url.startsWith("https://api.awin.com/"));
    calls.push({url,method:options.method||"GET"});
    return {ok:true,status:200,json:async()=>({promotions:[],programmes:[],pagination:{totalPages:1}})};
  };
  await fetchAwinOffers({publisherId:"3045061",token,fetchImpl});
  await fetchAwinPrograms({publisherId:"3045061",token,fetchImpl});
  await fetchAwinProgramDetails({publisherId:"3045061",token,advertiserId:"42",fetchImpl});
  await fetchAwinTransactions({publisherId:"3045061",token,startDate:"2026-11-01",endDate:"2026-11-19",fetchImpl});
  assert.equal(calls.length,8);
  assert.equal(calls[0].method,"POST");
  assert.ok(calls.some(call=>call.url.includes("relationship=joined")));
  assert.ok(calls.some(call=>call.url.includes("advertiserId=42")));
  assert.ok(calls.some(call=>call.url.includes("startDate=2026-11-01")));
});
