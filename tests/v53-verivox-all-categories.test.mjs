import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("verivox inventory lists 14 categories without claiming active embeds",()=>{
 const src=fs.readFileSync("scripts/build.mjs","utf8");
 const block=src.split("const verivoxInventory=[")[1]?.split("];")[0]||"";
 assert.equal((block.match(/^ \["/gm)||[]).length,14);
 assert.match(src,/Alle 14 Werbemittelbereiche im Überblick/);
 assert.match(src,/keine verfügbaren Tarife/);
 assert.match(src,/verivoxInventoryMarkup/);
});
