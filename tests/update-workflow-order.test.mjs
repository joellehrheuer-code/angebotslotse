import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const workflow=readFileSync(new URL("../.github/workflows/update.yml",import.meta.url),"utf8");
const updateJob=workflow.split("\n  commit:")[0];

test("real offer health gate runs before build, then full tests and all quality gates",()=>{
  const health=updateJob.indexOf("run: npm run catalog:health");
  const build=updateJob.indexOf("run: npm run check && npm run build");
  const tests=updateJob.indexOf("run: npm test");
  const gates=updateJob.indexOf("run: npm run validate && npm run seo && npm run security");
  const upload=updateJob.indexOf("uses: actions/upload-pages-artifact@v3");
  assert.ok(health>=0 && build>health && tests>build && gates>tests && upload>gates);
  for(const forbidden of ["run: npm test || true","continue-on-error: true"])
    assert.equal(updateJob.includes(forbidden),false);
  assert.match(updateJob,/Verified offer catalogue required/);
  assert.match(updateJob,/SOURCE_TOTAL_TIMEOUT_MS/);
});
