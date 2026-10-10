import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const build=()=>fs.readFileSync("scripts/build.mjs","utf8");
const js=()=>fs.readFileSync("public/app.js","utf8");
const css=()=>fs.readFileSync("public/v13.css","utf8");

test("startpage shows swipeable top deals, creator videos and Instant Gaming before secondary sections",()=>{
  const b=build();
  const start=b.indexOf("const homeBody=");
  const home=b.slice(start,b.indexOf("const homeBodyForValidation",start));
  assert.ok(start>=0);
  for(const anchor of ["${heroModule}","${offerSection(\"aktuelle-deals\"","${creatorVideoModule}","${instantGamingModule}","${portalBentoModule}"]){
    assert.ok(home.includes(anchor),"homepage missing "+anchor);
  }
  assert.ok(home.indexOf('${heroModule}')<home.indexOf('${offerSection("aktuelle-deals"'));
  assert.ok(home.indexOf('${offerSection("aktuelle-deals"')<home.indexOf("${creatorVideoModule}"));
  assert.ok(home.indexOf("${creatorVideoModule}")<home.indexOf("${portalBentoModule}"));
  assert.equal(home.split("${creatorVideoModule}").length-1,1);
  assert.equal(home.split("${instantGamingModule}").length-1,1);
  assert.match(css(),/#aktuelle-deals \.deal-rail\{/);
  assert.match(b, /\["Alle Angebote","\/suche\.html"\]/);
  assert.match(b, /homeMixedUnique,12,"\/suche\.html"\)/);
  assert.match(css(),/scroll-snap-type:x mandatory/);
});
test("review state never pretends unapproved submissions have public star ratings",()=>{
  const b=build(),app=js();
  assert.match(b,/Noch keine Freigabe/);
  assert.match(b,/data-community-rating-scale hidden/);
  assert.match(app,/reviewCount > 0 && Number\.isFinite\(rating\)/);
  assert.match(app,/Eingereichte Bewertungen werden geprüft/);
});
test("coupons use a validated literal code and offer working clipboard controls",()=>{
  const b=build(),app=js();
  assert.match(b,/const hasDisplayVoucher=o=>/);
  assert.match(b,/const voucherMarkup=o=>/);
  assert.match(b,/Die Ziffern im Code sind kein garantierter Rabatt/);
  assert.match(app,/data-copy-voucher/);
  assert.match(app,/navigator\.clipboard\.writeText\(code\)/);
});
test("creator Shorts are embedded only after explicit click with a strict YouTube ID",()=>{
  const b=build(),app=js();
  assert.match(b,/data-inline-youtube=/);
  assert.match(b,/youtubeShortIdForGroup/);
  assert.match(app,/youtube-nocookie\.com\/embed\//);
  assert.match(app,/\[data-inline-youtube\]/);
  assert.match(app,/replaceChildren\(frame\)/);
});
test("gaming partner area is embedded in the site, not only an outbound button",()=>{
  const b=build(),app=js();
  assert.match(b,/instant-gaming-embed-stage/);
  assert.match(b,/data-ig-banner-host/);
  assert.match(b,/data-ig-banner-load/);
  assert.match(app,/instantGamingLoad\?\.addEventListener\("click"/);
  assert.match(app,/host\.querySelector\("\[data-ig-placeholder\]"\)\?\.remove\(\)/);
});

test("creator video and book-preview arrows use the same scrolling controls as offer rails",()=>{
  const a=js();
  assert.match(a,/slider\.closest\("\.deal-section, \.creator-videos, \.book-preview"\)/);
  assert.match(a,/\[data-slider-prev\]/);
  assert.match(a,/\[data-slider-next\]/);
});
