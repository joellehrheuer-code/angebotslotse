import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const checklist=fs.readFileSync(path.join(root,"docs","COMPLETION-CHECKLIST.md"),"utf8");
const progressPath=path.join(root,"data","quality-progress.json");
const progress=fs.existsSync(progressPath)
  ? JSON.parse(fs.readFileSync(progressPath,"utf8"))
  : {completed:[],blocked:[],notes:{}};

const themes=[];
for(const line of checklist.split(/\r?\n/)){
  const m=line.match(/^\|\s*(\d{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
  if(m) themes.push({nr:m[1],name:m[2].trim(),proof:m[3].trim()});
}
if(themes.length<100) throw new Error(`Expected >=100 quality themes, got ${themes.length}`);

const aspects=[
  ["visual","Visuelle Hierarchie und Premium-Wirkung prüfen"],
  ["spacing","Abstände, Raster und Größenkonsistenz prüfen"],
  ["type","Typografie, Umbrüche und Lesbarkeit prüfen"],
  ["interaction","Interaktionen, Hover, Focus und Touch prüfen"],
  ["state","Loading-, Empty-, Success- und Disabled-Zustände prüfen"],
  ["a11y","Barrierefreiheit, Semantik und zugängliche Namen prüfen"],
  ["performance","Performance, unnötige Arbeit und Assetgewicht prüfen"],
  ["data","Datenqualität, Echtheit und Aktualität prüfen"],
  ["navigation","Navigation, Links und Rückwege prüfen"],
  ["errors","Fehlerfälle, Timeouts und Wiederherstellung prüfen"],
  ["regression","Regressionstest bzw. reproduzierbaren Nachweis prüfen"]
];
const contexts=[
  ["desktop1920","Desktop 1920×1080"],
  ["desktop1366","Desktop/Laptop 1366×768"],
  ["tablet768","Tablet 768 px"],
  ["mobile430","Mobile 430 px"],
  ["mobile390","Mobile 390 px"],
  ["mobile360","Mobile 360 px"],
  ["keyboard","Tastatur/Screenreader"],
  ["resilience","Reduced Motion, langsames Netz und Teilfehler"]
];

const completed=new Set(progress.completed||[]);
const blocked=new Set(progress.blocked||[]);
const rows=[];
let seq=0;
outer: for(const theme of themes){
  for(const [aspect,aspectLabel] of aspects){
    for(const [context,contextLabel] of contexts){
      seq+=1;
      if(seq>10000) break outer;
      const id=`Q${String(seq).padStart(5,"0")}`;
      const status=completed.has(id)?"done":blocked.has(id)?"blocked":"open";
      const highRisk=["007","008","010","012","018","032","041","052","054","055","058","062","065","069","077","080","087","090","091","092","093","097","103","104","107","108","113","114"].includes(theme.nr);
      const priority=highRisk?(aspect==="regression"||aspect==="errors"||aspect==="a11y"?"P0":"P1"):(aspect==="regression"?"P1":"P2");
      rows.push({
        id,
        themeNr:theme.nr,
        theme:theme.name,
        aspect,
        context,
        priority,
        status,
        check:`${aspectLabel} — ${contextLabel}`,
        acceptance:`${theme.name}: ${aspectLabel.toLowerCase()} im Kontext ${contextLabel}; keine unbelegten Behauptungen, kein sichtbarer Defekt und bei technischen Punkten reproduzierbarer Nachweis.`,
        note:progress.notes?.[id]||""
      });
    }
  }
}
if(rows.length!==10000) throw new Error(`Expected exactly 10000 checks, got ${rows.length}`);

const counts=rows.reduce((acc,row)=>{acc[row.status]=(acc[row.status]||0)+1;return acc;},{});
const next=rows.filter(r=>r.status==="open").sort((a,b)=>{
  const p={P0:0,P1:1,P2:2};
  return p[a.priority]-p[b.priority]||a.id.localeCompare(b.id);
}).slice(0,100);

const report={
  generatedAt:new Date().toISOString(),
  source:"docs/COMPLETION-CHECKLIST.md",
  total:rows.length,
  counts,
  nextTask:next[0]||null,
  tasks:rows
};
fs.mkdirSync(path.join(root,"report"),{recursive:true});
fs.writeFileSync(path.join(root,"report","quality-backlog.json"),JSON.stringify(report,null,2)+"\n");

const md=[
  "# Angebotslotse – nächste Qualitätsaufgaben",
  "",
  `Generiert: ${report.generatedAt}`,
  `Gesamt: **${rows.length}** · offen: **${counts.open||0}** · erledigt: **${counts.done||0}** · blockiert: **${counts.blocked||0}**`,
  "",
  "## Nächste 100 offene Checks",
  "",
  "| ID | Prio | Themenblock | Prüfung |",
  "|---|---|---|---|",
  ...next.map(r=>`| ${r.id} | ${r.priority} | ${r.themeNr} ${r.theme} | ${r.check} |`),
  "",
  "Statusänderungen werden in `data/quality-progress.json` geführt; der 10.000-Punkte-Backlog wird daraus reproduzierbar erzeugt.",
  ""
].join("\n");
fs.writeFileSync(path.join(root,"docs","QUALITY-NEXT.md"),md);

console.log(`Quality backlog generated: ${rows.length} checks; next=${report.nextTask?.id||"none"}`);