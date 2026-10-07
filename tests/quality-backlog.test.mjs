import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Quality-Backlog erzeugt exakt 10.000 reproduzierbare Checks", () => {
  execFileSync(process.execPath, ["scripts/generate-quality-backlog.mjs"], { stdio:"pipe" });
  const report=JSON.parse(fs.readFileSync("report/quality-backlog.json","utf8"));
  const next=fs.readFileSync("docs/QUALITY-NEXT.md","utf8");
  assert.equal(report.total,10000);
  assert.equal(report.tasks.length,10000);
  assert.match(report.tasks[0].id,/^Q\d{5}$/);
  assert.ok(report.nextTask);
  assert.match(next,/Gesamt: \*\*10000\*\*/);
  assert.match(next,/Nächste 100 offene Checks/);
});
