import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("integrity watcher creates only one active alert per protected file",()=>{
  const code=fs.readFileSync("supabase/functions/integrity-watch/index.ts","utf8");
  assert.match(code,/from private\.code_integrity_events\s+where path=\$\{path\} and resolved_at is null/);
  assert.match(code,/order by detected_at asc/);
  assert.match(code,/if\(existing\.length===0\)/);
  assert.match(code,/if\(created\.length\)/);
  assert.match(code,/on conflict\(event_key\) do nothing/);
  assert.match(code,/update private\.code_integrity_events[\s\S]*?set actual_sha=\$\{actual\}/);
  assert.doesNotMatch(code,/update private\.code_integrity_baseline/i);
  assert.match(code,/where path=\$\{path\}[\s\S]*?and resolved_at is null/);
});
test("unchanged protected files continue to resolve outstanding integrity events",()=>{
  const code=fs.readFileSync("supabase/functions/integrity-watch/index.ts","utf8");
  assert.match(code,/set resolved_at=now\(\)/);
  assert.match(code,/where path=\$\{path\}/);
});
