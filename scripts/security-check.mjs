import fs from "node:fs";
import path from "node:path";

const secret = process.env.AWIN_API_TOKEN;
const errors = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if ([".git",".env.local","node_modules"].includes(entry.name)) continue;
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(p);
    else {
      const content=fs.readFileSync(p);
      if(secret && secret.length >= 12 && content.includes(Buffer.from(secret))) errors.push(`Secretwert gefunden: ${p}`);
      if((p.startsWith(`dist${path.sep}`)||p.startsWith(`public${path.sep}`)) && /AWIN_API_TOKEN|IMPACT_AUTH_TOKEN/.test(content.toString("utf8"))) errors.push(`Secretname im öffentlichen Build: ${p}`);
    }
  }
}
walk("dist"); walk("public"); walk("scripts"); walk("data");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("Sicherheitsprüfung bestanden; keine Zugangsdaten in öffentlichen Dateien.");
