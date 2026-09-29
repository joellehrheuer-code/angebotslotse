const base=(process.env.SITE_URL||"https://joellehrheuer-code.github.io/angebotslotse").replace(/\/$/,"");
const attempts=Math.min(8,Math.max(1,Number(process.env.SMOKE_ATTEMPTS)||5));
const retryDelay=Math.max(1000,Number(process.env.SMOKE_RETRY_DELAY_MS)||4000);
const concurrency=Math.min(12,Math.max(1,Number(process.env.SMOKE_CONCURRENCY)||8));

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const transientHttpStatus=status=>status===429||(status>=500&&status<=599);
const fetchOk=async url=>{
  const maxFetchAttempts=Math.min(4,attempts);
  let lastError;
  for(let attempt=1;attempt<=maxFetchAttempts;attempt+=1){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(url,{cache:"no-store",signal:controller.signal,headers:{"user-agent":"Angebotslotse-Live-Smoke/1.0"}});
      if(response.ok)return response;
      const error=new Error(`HTTP ${response.status} ${response.statusText}`);
      error.status=response.status;
      throw error;
    }catch(error){
      lastError=error;
      const status=Number(error?.status);
      const networkError=!Number.isFinite(status);
      if(attempt===maxFetchAttempts||(!networkError&&!transientHttpStatus(status)))throw error;
      await sleep(Math.min(retryDelay,3000)*attempt);
    }finally{clearTimeout(timer);}
  }
  throw lastError;
};
const fetchText=async path=>(await fetchOk(`${base}${path}${path.includes("?")?"&":"?"}smoke=${Date.now()}`)).text();
const fetchJson=async path=>JSON.parse(await fetchText(path));

const readLiveState=async()=>{
  const [report,statusHtml,sitemap]=await Promise.all([
    fetchJson("/build-report.json"),
    fetchText("/status.html"),
    fetchText("/sitemap.xml")
  ]);
  const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].replaceAll("&amp;","&"));
  return {report,statusHtml,urls};
};

const validateState=({report,statusHtml,urls})=>{
  const errors=[];
  if(!Number.isInteger(report.offers)||report.offers<=0)errors.push(`build-report offers ungültig: ${report.offers}`);
  if(!Number.isInteger(report.rawRecords)||report.rawRecords<report.offers)errors.push(`build-report rawRecords ungültig: ${report.rawRecords}`);
  if(!Number.isInteger(report.sitemapUrls)||report.sitemapUrls!==urls.length)errors.push(`Sitemap-Anzahl ${urls.length} stimmt nicht mit build-report ${report.sitemapUrls} überein`);
  if(urls.length===0)errors.push("Sitemap enthält keine URLs");
  if(new Set(urls).size!==urls.length)errors.push("Sitemap enthält doppelte URLs");
  if(urls.some(url=>!url.startsWith(`${base}/`)&&url!==base))errors.push("Sitemap enthält fremde oder unerwartete URLs");
  const expected=[
    ["Veröffentlichte Angebote",report.offers],
    ["Gespeicherter Bestand",report.rawRecords],
    ["Warten auf Medien",report.awaitingMedia],
    ["Publisher-Werbetexte blockiert",report.blockedPublisherPromotions],
    ["Quarantänisiert",report.quarantined]
  ];
  for(const [label,value] of expected){
    if(!statusHtml.includes(`<dt>${label}</dt><dd>${value}</dd>`))errors.push(`Statusseite stimmt bei "${label}" nicht mit build-report überein`);
  }
  return errors;
};

let live;
let stateErrors=[];
for(let attempt=1;attempt<=attempts;attempt+=1){
  try{
    live=await readLiveState();
    stateErrors=validateState(live);
    if(stateErrors.length===0)break;
  }catch(error){
    stateErrors=[String(error?.message??error)];
  }
  if(attempt<attempts){
    console.log(`Live-Stand noch nicht konsistent (Versuch ${attempt}/${attempts}): ${stateErrors.join("; ")}`);
    await sleep(retryDelay);
  }
}
if(!live||stateErrors.length)throw new Error(`Live-Statusprüfung fehlgeschlagen: ${stateErrors.join("; ")}`);

let index=0;
const failures=[];
const worker=async()=>{
  while(true){
    const current=index++;
    if(current>=live.urls.length)return;
    const url=live.urls[current];
    try{await fetchOk(`${url}${url.includes("?")?"&":"?"}smoke=${Date.now()}`);}
    catch(error){failures.push({url,error:String(error?.message??error)});}
  }
};
await Promise.all(Array.from({length:concurrency},worker));
if(failures.length){
  console.error(JSON.stringify(failures.slice(0,20),null,2));
  throw new Error(`${failures.length} von ${live.urls.length} Sitemap-URLs sind nicht erreichbar`);
}
console.log(`Live-Smoke bestanden: ${live.report.offers} veröffentlichte Angebote, ${live.report.rawRecords} gespeichert, ${live.urls.length}/${live.urls.length} Sitemap-URLs erreichbar.`);
