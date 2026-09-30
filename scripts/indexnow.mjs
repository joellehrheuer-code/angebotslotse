const site=(process.env.SITE_URL||"https://joellehrheuer-code.github.io/angebotslotse").replace(/\/$/,"");
const key="7d4c2e9a6f184b4aa713c95e2f0b8d31";
const keyLocation=`${site}/${key}.txt`;
const urlList=["/","/neu.html","/preis-gefallen.html","/endet-bald.html","/rabattcodes.html"].map(path=>`${site}${path}`);
const payload={host:new URL(site).host,key,keyLocation,urlList};

if(process.env.INDEXNOW_DRY_RUN==="1"){
  console.log(JSON.stringify(payload,null,2));
  process.exit(0);
}

const response=await fetch("https://api.indexnow.org/indexnow",{
  method:"POST",
  headers:{"content-type":"application/json; charset=utf-8"},
  body:JSON.stringify(payload)
});
if(![200,202].includes(response.status)){
  const body=await response.text().catch(()=>"");
  throw new Error(`IndexNow failed with HTTP ${response.status}: ${body.slice(0,300)}`);
}
console.log(`IndexNow accepted ${urlList.length} changed hub URLs with HTTP ${response.status}`);
