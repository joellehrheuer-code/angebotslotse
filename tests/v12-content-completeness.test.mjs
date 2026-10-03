import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const build = () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });
};

test("jede veröffentlichte Angebotszeile landet auf Detailseite Feed und Sitemap", () => {
  build();
  const report=JSON.parse(fs.readFileSync("dist/build-report.json","utf8"));
  const alertFeed=JSON.parse(fs.readFileSync("dist/alerts-feed.json","utf8"));
  const sitemap=fs.readFileSync("dist/sitemap.xml","utf8");
  const detailFiles=fs.readdirSync("dist/angebote").filter(name=>name.endsWith(".html"));
  const sitemapOfferUrls=[...sitemap.matchAll(/<loc>([^<]*\/angebote\/[^<]+\.html)<\/loc>/g)].map(match=>match[1]);

  assert.equal(detailFiles.length,report.offers,"Nicht jedes veröffentlichte Angebot hat eine Detailseite.");
  assert.equal(alertFeed.offers.length,report.offers,"Öffentlicher Angebotsfeed ist unvollständig.");
  assert.equal(sitemapOfferUrls.length,report.offers,"Sitemap enthält nicht alle veröffentlichten Angebote.");
  assert.equal(new Set(sitemapOfferUrls).size,report.offers,"Sitemap enthält doppelte Angebotsseiten.");

  const feedSlugs=new Set(alertFeed.offers.map(row=>row.slug));
  for(const file of detailFiles){
    const slug=file.replace(/\.html$/,"");
    assert.ok(feedSlugs.has(slug),`Detailseite fehlt im Feed: ${slug}`);
    assert.ok(sitemapOfferUrls.some(url=>url.endsWith(`/angebote/${file}`)),`Detailseite fehlt in Sitemap: ${file}`);
  }
});

test("wichtige sichtbare Interaktionen bleiben an JavaScript gekoppelt", () => {
  build();
  const home=fs.readFileSync("dist/index.html","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  const contracts=[
    ["data-report-open","data-report-open"],
    ["data-app-install","data-app-install"],
    ["data-slider-prev","data-slider-prev"],
    ["data-slider-next","data-slider-next"],
    ["data-ig-banner-load","data-ig-banner-load"]
  ];
  for(const [markup,handler] of contracts){
    if(home.includes(markup))assert.ok(app.includes(handler),`Kein JS-Vertrag für ${markup}`);
  }
  assert.match(home,/class="menu-toggle"/);
  assert.match(app,/querySelector\("\.menu-toggle"\)/);
  assert.match(app,/addEventListener\("click"/);
});
