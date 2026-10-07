import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Impact darf in jedem Update laufen, wird aber durch 24h-Datencadence geschützt", () => {
  const workflow=fs.readFileSync(".github/workflows/update.yml","utf8");
  assert.match(workflow,/IMPACT_SYNC_ENABLED:\s*"1"/);
  assert.match(workflow,/FORCE_IMPACT_SYNC:\s*"0"/);
  assert.match(workflow,/IMPACT_SYNC_EVERY_HOURS:\s*24/);
  assert.match(workflow,/cron:\s*"17 \*\/4 \* \* \*"/);
  assert.doesNotMatch(workflow,/cron:\s*"23 2 \* \* \*"/);
});
