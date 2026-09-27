import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match => JSON.parse(match[1]));

const graphTypes = schema => new Set((schema?.["@graph"] || [schema]).map(node => node?.["@type"]).filter(Boolean));

test("Kategorie-, Shop- und Marken-Hubs nutzen interne CollectionPage-Strukturdaten", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio:"pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio:"pipe",
    env:{...process.env,SITE_URL:"https://example.test/angebotslotse"}
  });

  const categoryFiles = ["gaming.html","technik.html","computer.html","audio-musik.html","haushalt.html"]
    .map(file => path.join("dist",file))
    .filter(file => fs.existsSync(file) && /<meta name="robots" content="index,follow,max-image-preview:large">/.test(fs.readFileSync(file,"utf8")));
  const shopFiles = fs.readdirSync("dist/shops").filter(file => file.endsWith(".html")).map(file => path.join("dist/shops",file));
  const brandFiles = fs.readdirSync("dist/marken").filter(file => file.endsWith(".html")).map(file => path.join("dist/marken",file));

  assert.ok(categoryFiles.length > 0);
  assert.ok(shopFiles.length > 0);
  assert.ok(brandFiles.length > 0);

  for (const file of [categoryFiles[0],shopFiles[0],brandFiles[0]]) {
    const html=fs.readFileSync(file,"utf8");
    const schema=schemas(html).find(item => Array.isArray(item?.["@graph"]));
    assert.ok(schema, "fehlendes @graph in "+file);
    const types=graphTypes(schema);
    assert.ok(types.has("CollectionPage"), "CollectionPage fehlt in "+file);
    assert.ok(types.has("BreadcrumbList"), "BreadcrumbList fehlt in "+file);
    assert.ok(types.has("ItemList"), "ItemList fehlt in "+file);
    const json=JSON.stringify(schema);
    assert.match(json,/https:\/\/example\.test\/angebotslotse\/angebote\//);
    assert.doesNotMatch(json,/(awin1\.com|sjv\.io|tradedoubler\.com\/click|webgains\.com\/click|instant-gaming\.com\/\?igr=)/i);
  }
});


test("Hub-Indizes und Rabattcodes verlinken in strukturierten Daten nur interne Seiten", () => {
  const files=["dist/kategorien.html","dist/shops.html","dist/marken.html","dist/rabattcodes/index.html"];
  for (const file of files) {
    assert.ok(fs.existsSync(file), "fehlende Build-Datei: "+file);
    const html=fs.readFileSync(file,"utf8");
    const schemaList=schemas(html);
    assert.ok(schemaList.length > 0, "fehlendes JSON-LD in "+file);
    const joined=JSON.stringify(schemaList);
    assert.doesNotMatch(joined,/(awin1\.com|sjv\.io|tradedoubler\.com\/click|webgains\.com\/click|instant-gaming\.com\/\?igr=)/i);
    if (!file.includes("rabattcodes")) {
      const graph=schemaList.find(item=>Array.isArray(item?.["@graph"]));
      assert.ok(graph, "fehlendes Collection-@graph in "+file);
      const types=graphTypes(graph);
      assert.ok(types.has("CollectionPage"));
      assert.ok(types.has("ItemList"));
    } else {
      assert.match(joined,/https:\/\/example\.test\/angebotslotse\/angebote\//);
    }
  }
});
