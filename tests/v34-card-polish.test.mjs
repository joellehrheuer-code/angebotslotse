import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("product card price and action hierarchy stays calm and accessible",()=>{
 const css=fs.readFileSync("public/v13.css","utf8");
 assert.match(css,/V34 — restrained shopping-card refinements/);
 assert.match(css,/\.deal-card \.media-wrap img,\.deal-card \.product-image img\{object-fit:contain!important/);
 assert.match(css,/\.deal-card \.price\{font-size:clamp\(20px,2vw,25px\)/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});