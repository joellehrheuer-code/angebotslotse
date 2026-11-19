import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const auditScript = fileURLToPath(new URL("../scripts/seo-audit.mjs", import.meta.url));
const site = "https://example.github.io/angebotslotse";
const home = site + "/";
const description = "Ein überprüfbarer Beispielinhalt für den isolierten SEO-Sitemap-Test, ganz ohne Produktdaten oder externe Händlerfreigaben.";
const html = `<!doctype html><html lang="de"><head><title>Startseite für SEO-Sitemap-Regressionstest</title><meta name="description" content="${description}"><link rel="canonical" href="${home}"><meta name="robots" content="index,follow"></head><body><h1>SEO-Sitemap-Regressionstest</h1></body></html>`;

function runAudit(extraUrls = []) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "angebotslotse-seo-"));
  try {
    fs.mkdirSync(path.join(cwd, "dist"));
    fs.writeFileSync(path.join(cwd, "dist/index.html"), html);
    fs.writeFileSync(path.join(cwd, "dist/sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[home, ...extraUrls].map(url => `<url><loc>${url}</loc></url>`).join("")}</urlset>`);
    const result = spawnSync(process.execPath, [auditScript], {
      cwd, env: { ...process.env, SITE_URL: site }, encoding: "utf8"
    });
    const report = JSON.parse(fs.readFileSync(path.join(cwd, "report/seo-report.json"), "utf8"));
    return { status: result.status, report };
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

test("SEO audit accepts a sitemap containing exactly its real indexable canonical page", () => {
  const { status, report } = runAudit();
  assert.equal(status, 0);
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.warnings, 0);
  assert.equal(report.summary.sitemapUrls, 1);
});

test("SEO audit blocks a nonexistent URL included alongside a valid page", () => {
  const extraUrl = site + "/angebote/nicht-vorhanden.html";
  const { status, report } = runAudit([extraUrl]);
  assert.equal(status, 1);
  assert.ok(report.errors.some(error =>
    error.type === "sitemap-url-without-indexable-self-canonical-page" &&
    error.page === extraUrl
  ));
});

test("SEO audit rejects a duplicate loc even when it resolves to a valid canonical page", () => {
  const { status, report } = runAudit([home]);
  assert.equal(status, 1);
  assert.equal(report.summary.sitemapUrls, 1, "unique URL count must not disguise duplicate entries");
  assert.ok(report.errors.some(error =>
    error.type === "duplicate-sitemap-url" && error.page === home
  ));
});
