import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("homepage deal rail uses only verified inventory, not hardcoded or invented offers",()=>{
  const build=fs.readFileSync("scripts/build.mjs","utf8");
  assert.ok(build.includes("const homeMixedUnique=selectSpotlightProducts(offers,12);"),"strict spotlight must remain unchanged");
  assert.ok(build.includes("const homepageMixed=diversifyOffers([...spotlightProducts,...homepage.dailyHighlights,...homepage.newest,...topDiscounts,...priceDrops,...offers]"),"fallback candidates must originate from actual verified offers");
  assert.ok(build.includes("const homeVerifiedRail=homeMixedUnique.length?homeMixedUnique:homepageMixed;"));
  assert.ok(build.includes('offerSection("aktuelle-deals","Top-Angebote zum Durchblättern","Aktuelle Produkte mit Originalbildern und bekannten Preisen.",homeVerifiedRail,12,"/suche.html")'));
  assert.ok(build.includes('const offerSection=(id,title,copy,items,limit=10,allHref="/kategorien.html")=>items.length?'),"rail must remain absent with zero verified items");
});
