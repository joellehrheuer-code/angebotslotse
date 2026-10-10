import fs from "node:fs";
import path from "node:path";
import {detectHighRiskCredential,isPotentiallySensitivePublicFilename} from "./lib/secret-patterns.mjs";

const secrets = [
  process.env.AWIN_API_TOKEN,
  process.env.AWIN_DATAFEED_API_KEY,
  process.env.IMPACT_AUTH_TOKEN,
  process.env.AMAZON_CREATORS_CREDENTIAL_SECRET,
  process.env.SUPABASE_SECRET_KEY,
  process.env.RESEND_API_KEY
].filter(value => value?.length >= 12);
const forbiddenPublicNames = /AWIN_API_TOKEN|AWIN_DATAFEED_API_KEY|IMPACT_AUTH_TOKEN|AMAZON_CREATORS_CREDENTIAL_SECRET|SUPABASE_SECRET_KEY|RESEND_API_KEY/;
const errors = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if ([".git",".env.local","node_modules"].includes(entry.name)) continue;
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(p);
    else {
      const content=fs.readFileSync(p);
      if(secrets.some(secret => content.includes(Buffer.from(secret)))) errors.push(`Secretwert gefunden: ${p}`);
      const publiclyReachable=p.startsWith(`dist${path.sep}`)||p.startsWith(`public${path.sep}`);
      if(publiclyReachable) {
        const visible=content.toString("utf8");
        if(forbiddenPublicNames.test(visible)) errors.push(`Secretname im öffentlichen Build: ${p}`);
        for(const type of detectHighRiskCredential(visible)) errors.push(`Öffentliches ${type}-Geheimnis gefunden: ${p}`);
        if(isPotentiallySensitivePublicFilename(p)) errors.push(`Geheime Dateiendung im öffentlichen Build: ${p}`);
      }
    }
  }
}
walk("dist"); walk("public"); walk("scripts"); walk("data");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("Sicherheitsprüfung bestanden; keine Zugangsdaten in öffentlichen Dateien.");
