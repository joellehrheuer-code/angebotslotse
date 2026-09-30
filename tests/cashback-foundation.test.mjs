import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql=fs.readFileSync("sql/cashback-foundation.sql","utf8");
const account=fs.readFileSync("src/account-client.js","utf8");
const build=fs.readFileSync("scripts/build.mjs","utf8");

test("Cashback-Schema ist fail-closed und nutzergebunden",()=>{
  assert.match(sql,/eligibility in \('review','allowed','forbidden'\)/);
  assert.match(sql,/commission_share_bps integer not null default 0/);
  assert.match(sql,/revoke all on table public\.cashback_claims from anon, authenticated/);
  assert.match(sql,/grant select on table public\.cashback_claims to authenticated/);
  assert.doesNotMatch(sql,/grant\s+(?:insert|update|delete).*cashback_claims.*authenticated/i);
  assert.match(sql,/using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql,/private\.affiliate_transactions/);
  assert.match(sql,/private\.cashback_click_tokens/);
});

test("Konto zeigt nur serverseitige Cashback-Ansprüche und kann keine Claims schreiben",()=>{
  assert.match(build,/data-account-cashback-card/);
  assert.match(build,/keine automatische Auszahlung/i);
  assert.match(account,/\.from\("cashback_claims"\)\s*\.select/);
  assert.doesNotMatch(account,/\.from\("cashback_claims"\)\s*\.(?:insert|upsert|update|delete)/);
  assert.match(account,/loadCashbackClaims/);
});
