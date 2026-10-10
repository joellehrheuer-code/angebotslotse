import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=()=>fs.readFileSync("supabase/functions/public-intake/index.ts","utf8");
test("anonymous intake enforces a real request-stream size limit",()=>{
  const s=read();
  assert.match(s,/async function readJsonBody\(/);
  assert.match(s,/req\.body\?\.getReader\(\)/);
  assert.match(s,/bytes \+= value\.byteLength/);
  assert.match(s,/bytes > maxBytes/);
  assert.match(s,/await reader\.cancel\(\)/);
  assert.match(s,/if \(incoming\.tooLarge\).*413/);
  assert.doesNotMatch(s,/await req\.json\(\)/);
});
test("anonymous intake never fails open on database errors",()=>{
  const s=read();
  assert.match(s,/\.eq\("request_count", count\)/);
  assert.match(s,/\.select\("key"\)\.maybeSingle\(\)/);
  assert.match(s,/insertError\.code !== "23505"/);
  assert.match(s,/if \(error\).*\{/);
  assert.match(s,/temporarily_unavailable/);
  assert.match(s,/rate_limited/);
});
test("review approval requires authenticated moderator, not public intake",()=>{
  const m=fs.readFileSync("supabase/functions/review-moderation/index.ts","utf8");
  assert.match(m,/\.auth\.getUser\(\)/);
  assert.match(m,/\.from\("review_moderators"\)/);
  assert.match(m,/if \(!moderator\).*403/);
  assert.match(m,/\.eq\("status", "pending"\)/);
});
