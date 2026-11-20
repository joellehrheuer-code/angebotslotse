import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("source-verified catalogue is preserved as artifact before failing page-level gates", () => {
  const workflow = fs.readFileSync(".github/workflows/update.yml", "utf8").replace(/\r\n/g, "\n");
  const health = workflow.indexOf("      - name: Verified offer catalogue required\n");
  const snapshot = workflow.indexOf("      - name: Preserve verified import snapshot before page-level acceptance\n");
  const build = workflow.indexOf("      - name: Build verified site before page-level tests\n");
  const siteTests = workflow.indexOf("      - name: Full tests after source refresh and build\n");
  assert.ok(health !== -1 && health < snapshot && snapshot < build && build < siteTests);
  const snapshotStep = workflow.slice(snapshot, build);
  assert.match(snapshotStep, /uses: actions\/upload-artifact@v4/);
  assert.match(snapshotStep, /name: verified-import-snapshot-\$\{\{ github\.run_id \}\}/);
  assert.match(snapshotStep, /retention-days: 7/);
  for(const filename of ["data/offers.json", "data/status.json", "data/price-history.json"]) {
    assert.ok(snapshotStep.includes(filename));
  }
  assert.doesNotMatch(snapshotStep, /if:\s*(?:always\(\)|success\(\)|failure\(\)|\$\{\{)/);
  assert.ok(!snapshotStep.includes("secrets."),"Do not persist sensitive credential values");
  assert.match(workflow, /deploy:\n\s+needs:\s+\[update, commit\]/);
  assert.match(workflow, /commit:\n\s+needs: update/);
});
