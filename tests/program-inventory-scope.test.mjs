import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Awin-Ranking bewertet den vollständigen Programmbestand statt nur den 200er Report", () => {
  const source=fs.readFileSync("scripts/update.mjs","utf8");
  assert.match(source,/const allProgrammeRows=/);
  assert.match(source,/const programmeRows=allProgrammeRows[\s\S]*?slice\(0,200\)/);
  assert.match(source,/rankAwinOpportunities\(\{programs:allProgrammeRows/);
  assert.match(source,/totalProgramsEvaluated:allProgrammeRows\.length/);
});
