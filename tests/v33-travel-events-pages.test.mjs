import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("travel, experiences and concerts have distinct honest category landing pages",()=>{
const build=fs.readFileSync("scripts/build.mjs","utf8");
for(const [name,path] of [["Reisen & Freizeit","reisen.html"],["Erlebnisse","erlebnisse.html"],["Events & Konzerte","events.html"]]){
 assert.ok(build.includes(name));
 assert.ok(build.includes('"/'+path+'"'));
 assert.ok(build.includes('"'+path+'":['));
}
assert.match(build,/keine ungeprüften Preise/);
assert.match(build,/rechtmäßig eingebundene Ticketangebote/);
});
