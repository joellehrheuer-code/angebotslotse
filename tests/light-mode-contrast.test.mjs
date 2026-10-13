import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("public/v13.css","utf8");
const rgb=hex=>hex.match(/.{2}/g).map(part=>parseInt(part,16)/255);
const luminance=hex=>rgb(hex).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4)
  .reduce((total,value,index)=>total+value*[.2126,.7152,.0722][index],0);
const ratio=(foreground,background)=>{
  const a=luminance(foreground),b=luminance(background);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
};

test("Light theme preserves bright copy on the dark editorial hero",()=>{
  assert.match(source,/html\[data-theme="light"\] \.premium-hero\.portal-hero \.hero-redesign-copy h1/);
  assert.match(source,/html\[data-theme="light"\] \.premium-hero\.portal-hero \.hero-redesign-copy>p/);
  assert.ok(ratio("f8f9fd","0b0e15")>=4.5);
  assert.ok(ratio("d5ddea","0d1018")>=4.5);
});

test("creator video player buttons have readable explicit contrast in all themes",()=>{
  assert.match(source,/\.creator-video-card \.creator-video-inline-button\{/);
  assert.match(source,/html\[data-theme="light"\] \.creator-video-card \.creator-video-inline-button\{/);
  assert.ok(ratio("ffffff","24314b")>=4.5);
  assert.ok(ratio("ffffff","273b60")>=4.5);
  assert.match(source,/outline:2px solid #ed8dcc/);
});

test("Light theme uses readable dark captions on its white creator cards",()=>{
  assert.match(source,/html\[data-theme="light"\] \.creator-video-card small/);
  assert.ok(ratio("40516b","ffffff")>=4.5);
});
