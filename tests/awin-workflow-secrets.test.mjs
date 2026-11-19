import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/update.yml", import.meta.url), "utf8");
const updateJob = workflow.split("\n  commit:")[0];

test("Awin legacy feed URL secrets reach the update job", () => {
  for (const name of ["AWIN_FEED_LIST_URL", "AWIN_LEGACY_FEED_URLS"]) {
    const expected = "          " + name + ": $" + "{{ secrets." + name + " }}";
    assert.ok(updateJob.includes(expected), `Missing secret wiring: ${name}`);
    assert.equal(updateJob.split("\n").filter(line => line.trim().startsWith(name + ":")).length, 1);
  }
  assert.match(updateJob, /Verified offer catalogue required/);
  assert.match(updateJob, /npm run catalog:health/);
});
