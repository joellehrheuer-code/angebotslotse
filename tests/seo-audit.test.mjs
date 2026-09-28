import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("technischer SEO-Audit bleibt fehler- und hinweisfrei", () => {
  const env = { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" };
  execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: process.cwd(), env, stdio: "ignore" });
  execFileSync(process.execPath, ["scripts/seo-audit.mjs"], { cwd: process.cwd(), env, stdio: "ignore" });
  const report = JSON.parse(fs.readFileSync("report/seo-report.json", "utf8"));
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.warnings, 0);
  assert.equal(report.summary.indexableSelfCanonical, report.summary.sitemapUrls);
  assert.ok(report.summary.indexableSelfCanonical > 200);
});
