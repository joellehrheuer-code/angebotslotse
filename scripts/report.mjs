import fs from "node:fs/promises";
import { fetchAwinTransactions, formatAwinDateTime } from "./lib/awin.mjs";
const end = new Date(); const start = new Date(end); start.setDate(start.getDate()-30);
const payload = await fetchAwinTransactions({publisherId:process.env.AWIN_PUBLISHER_ID,token:process.env.AWIN_API_TOKEN,startDate:formatAwinDateTime(start),endDate:formatAwinDateTime(end)});
const rows = Array.isArray(payload) ? payload : payload.transactions ?? [];
const commission = rows.reduce((sum,r)=>sum+Number(r.commissionAmount?.amount ?? r.commissionAmount ?? 0),0);
await fs.mkdir("data/private",{recursive:true});
await fs.writeFile("data/private/report.json",JSON.stringify({generatedAt:new Date().toISOString(),days:30,transactions:rows.length,commission:Number(commission.toFixed(2)),currency:"EUR"},null,2));
console.log(`Privater Report erstellt: ${rows.length} Transaktionen.`);
