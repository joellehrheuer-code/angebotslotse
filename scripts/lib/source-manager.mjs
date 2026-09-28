import { fetchAwinOffers, fetchAwinPrograms, fetchAwinProgramDetails } from "./awin.mjs";
import { categoryForProgram, isStrategicProgram } from "./program-growth.mjs";
import { fetchAwinProductFeeds, fetchAwinEnhancedFeeds } from "./awin-product-feeds.mjs";
import { fetchImpactOffers } from "./impact.mjs";
import { fetchDirectOffers } from "./direct.mjs";
import { fetchAmazonCreatorItems } from "./amazon.mjs";
import { fetchDaisyconOffers, fetchDaisyconPrograms, fetchDaisyconMedia, fetchDaisyconProgramReview } from "./daisycon.mjs";
import { fetchTradedoublerOffers, fetchTradedoublerVouchers } from "./tradedoubler.mjs";
import { fetchWebgainsOffers, fetchWebgainsProgramMemberships, fetchWebgainsProgramReview } from "./webgains.mjs";
import fs from "node:fs/promises";

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const isTransientSourceError = error => {
  const status = Number(error?.status ?? error?.statusCode);
  const message = String(error?.message ?? error ?? "");
  return [408,425,429,500,502,503,504].includes(status) || /(?:\b408\b|\b425\b|\b429\b|\b50[0-4]\b|fetch failed|econnreset|etimedout|enotfound|eai_again|socket|network)/i.test(message);
};

export async function runSourceWithRetry(run, { attempts = 2, baseDelayMs = 400, sleep = wait } = {}) {
  const maxAttempts = Math.min(3, Math.max(1, Number(attempts) || 1));
  const delay = Math.max(0, Number(baseDelayMs) || 0);
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try { return await run(); }
    catch (error) {
      lastError = error;
      if (!isTransientSourceError(error) || attempt === maxAttempts) throw error;
      await sleep(delay * (2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

export async function collectSources(env = process.env) {
  const impactCadenceHours=Math.min(24,Math.max(4,Number(env.IMPACT_SYNC_EVERY_HOURS)||12));
  const syncHour=Number.isFinite(Number(env.SOURCE_SYNC_UTC_HOUR))?Number(env.SOURCE_SYNC_UTC_HOUR):new Date().getUTCHours();
  const impactDue=env.FORCE_IMPACT_SYNC==="1" || syncHour % impactCadenceHours===0;
  const impactLinkPolicy = JSON.parse(await fs.readFile("data/impact-link-policy.json", "utf8").catch(() => "{}"));
  const amazonDefinitions = JSON.parse(await fs.readFile("data/amazon-products.json", "utf8").catch(() => '{"items":[]}' ));
  let awinPrograms=null;
  let awinDiscoveryOffers=[];
  let awinDiscoveryError=null;
  let daisyconPrograms=null;
  let daisyconProgramError=null;
  let daisyconMedia=[];
  const daisyconProgramReviews={};
  let webgainsMemberships=[];
  let webgainsMembershipError=null;
  const webgainsProgramReviews={};
  const awinProgramDetails={};
  if(env.AWIN_PUBLISHER_ID&&env.AWIN_API_TOKEN) {
    try{awinPrograms=await runSourceWithRetry(()=>fetchAwinPrograms({publisherId:env.AWIN_PUBLISHER_ID,token:env.AWIN_API_TOKEN}));}catch{}
    try{awinDiscoveryOffers=await runSourceWithRetry(()=>fetchAwinOffers({publisherId:env.AWIN_PUBLISHER_ID,token:env.AWIN_API_TOKEN,membership:"notJoined",maxPages:5}));}catch(error){awinDiscoveryError=String(error.message).slice(0,160);}
    const detailLimit=Math.min(8,Math.max(0,Number(env.AWIN_PROGRAM_DETAIL_LIMIT)||6));
    const detailCandidates=[...(awinPrograms?.notjoined??[]),...(awinPrograms?.pending??[])]
      .filter(program=>isStrategicProgram(program)||categoryForProgram(program)!=="Weitere")
      .sort((a,b)=>Number(isStrategicProgram(b))-Number(isStrategicProgram(a))||String(a.name??"").localeCompare(String(b.name??""),"de"))
      .slice(0,detailLimit);
    for(const program of detailCandidates){
      const advertiserId=program.id??program.advertiserId;
      if(!advertiserId)continue;
      try{awinProgramDetails[String(advertiserId)]=await fetchAwinProgramDetails({publisherId:env.AWIN_PUBLISHER_ID,token:env.AWIN_API_TOKEN,advertiserId,relationship:String(program.relationship??"notjoined").toLowerCase()});}
      catch{/* KPI enrichment is optional; discovery continues without it. */}
    }
  }
  if(env.DAISYCON_PUBLISHER_ID&&env.DAISYCON_ACCESS_TOKEN){
    try{daisyconPrograms=await runSourceWithRetry(()=>fetchDaisyconPrograms({publisherId:env.DAISYCON_PUBLISHER_ID,accessToken:env.DAISYCON_ACCESS_TOKEN}));}
    catch(error){daisyconProgramError=String(error.message).slice(0,160);}
    try{daisyconMedia=await runSourceWithRetry(()=>fetchDaisyconMedia({publisherId:env.DAISYCON_PUBLISHER_ID,accessToken:env.DAISYCON_ACCESS_TOKEN}));}
    catch{/* Media enrichment is optional. */}
    const mediaId=(daisyconMedia.find(row=>/approved|active|verified/i.test(String(row?.approval_status??row?.approvalStatus??row?.status??"")))??daisyconMedia[0])?.id??null;
    const reviewLimit=Math.min(8,Math.max(0,Number(env.DAISYCON_PROGRAM_REVIEW_LIMIT)||8));
    const reviewCandidates=(daisyconPrograms??[])
      .filter(program=>isStrategicProgram(program)||categoryForProgram({name:program?.name??program?.program_name,primarySector:program?.category??program?.sector??program?.description})!=="Weitere")
      .slice(0,reviewLimit);
    for(const program of reviewCandidates){
      const programId=program?.id??program?.program_id;
      if(!programId)continue;
      try{daisyconProgramReviews[String(programId)]=await fetchDaisyconProgramReview({publisherId:env.DAISYCON_PUBLISHER_ID,accessToken:env.DAISYCON_ACCESS_TOKEN,programId,mediaId});}
      catch{/* Review enrichment is optional; ranking continues. */}
    }
  }
  if(env.WEBGAINS_PUBLISHER_ID&&env.WEBGAINS_ACCESS_TOKEN){
    try{
      webgainsMemberships=await runSourceWithRetry(()=>fetchWebgainsProgramMemberships({
        publisherId:env.WEBGAINS_PUBLISHER_ID,
        accessToken:env.WEBGAINS_ACCESS_TOKEN,
        size:Number(env.WEBGAINS_MEMBERSHIP_LIMIT)||100
      }));
    }catch(error){webgainsMembershipError=String(error.message).slice(0,160);}
    const reviewLimit=Math.min(8,Math.max(0,Number(env.WEBGAINS_PROGRAM_REVIEW_LIMIT)||6));
    const candidates=(webgainsMemberships??[])
      .filter(row=>{
        const program=row?.program&&typeof row.program==="object"?row.program:{};
        const name=program.name??row?.program_name??row?.programName??row?.name??row?.merchant_name??"";
        const sector=program.categories??row?.category??row?.categories??row?.description??"";
        return isStrategicProgram({name})||categoryForProgram({name,primarySector:Array.isArray(sector)?sector.join(" "):sector})!=="Weitere";
      })
      .slice(0,reviewLimit);
    for(const membership of candidates){
      const programId=membership?.program?.id??membership?.program_id??membership?.programId;
      if(!programId)continue;
      try{
        webgainsProgramReviews[String(programId)]=await fetchWebgainsProgramReview({
          publisherId:env.WEBGAINS_PUBLISHER_ID,
          accessToken:env.WEBGAINS_ACCESS_TOKEN,
          membership
        });
      }catch{/* Terms enrichment is optional; discovery continues without it. */}
    }
  }
  const joined=(awinPrograms?.joined??[]).map(row=>({id:row.id??row.advertiserId,name:row.name??row.advertiserName})).filter(row=>row.id);
  const definitions = [
    ["awin", () => fetchAwinOffers({ publisherId: env.AWIN_PUBLISHER_ID, token: env.AWIN_API_TOKEN })],
    ["awin-enhanced-feeds", async()=>{const result=await fetchAwinEnhancedFeeds({publisherId:env.AWIN_PUBLISHER_ID,token:env.AWIN_API_TOKEN,advertisers:joined,maxProducts:1200});const rows=result.products;Object.defineProperty(rows,"audit",{value:{feeds:result.feeds},enumerable:false});return rows;}],
    ["awin-product-feeds", () => fetchAwinProductFeeds({ apiKey: env.AWIN_DATAFEED_API_KEY, maxProducts: 1000 })],
    ["direct", () => fetchDirectOffers()],
    ["amazon", () => fetchAmazonCreatorItems({ credentialId: env.AMAZON_CREATORS_CREDENTIAL_ID, credentialSecret: env.AMAZON_CREATORS_CREDENTIAL_SECRET, partnerTag: env.AMAZON_PARTNER_TAG, definitions: amazonDefinitions.items ?? [] })],
    ["impact", () => fetchImpactOffers({ accountSid: env.IMPACT_ACCOUNT_SID, authToken: env.IMPACT_AUTH_TOKEN, linkPolicy: impactLinkPolicy })],
    ["daisycon", () => fetchDaisyconOffers({ publisherId: env.DAISYCON_PUBLISHER_ID, accessToken: env.DAISYCON_ACCESS_TOKEN, maxProducts: Number(env.DAISYCON_MAX_PRODUCTS) || 100 })],
    ["tradedoubler", () => fetchTradedoublerOffers({ token: env.TRADEDOUBLER_PRODUCTS_TOKEN, feedUrls: env.TRADEDOUBLER_FEED_URLS, maxProducts: Number(env.TRADEDOUBLER_MAX_PRODUCTS) || 1000, maxFeeds: Number(env.TRADEDOUBLER_MAX_FEEDS) || 8 })],
    ["tradedoubler-vouchers", () => fetchTradedoublerVouchers({ token: env.TRADEDOUBLER_VOUCHERS_TOKEN, maxVouchers: Number(env.TRADEDOUBLER_MAX_VOUCHERS) || 1000 })],
    ["webgains", () => fetchWebgainsOffers({ feedUrls: env.WEBGAINS_FEED_URLS, maxProducts: Number(env.WEBGAINS_MAX_PRODUCTS) || 1000 })]
  ];
  const results = await Promise.all(definitions.map(async ([name, run]) => {
    if (name === "awin" && (!env.AWIN_PUBLISHER_ID || !env.AWIN_API_TOKEN)) { const names = [!env.AWIN_PUBLISHER_ID && "AWIN_PUBLISHER_ID", !env.AWIN_API_TOKEN && "AWIN_API_TOKEN"].filter(Boolean); return { name, state: "disabled", rows: [], audit:{reason:`${names.join(", ")} missing – Awin API sync skipped`} }; }
    if (name === "impact" && (!env.IMPACT_ACCOUNT_SID || !env.IMPACT_AUTH_TOKEN)) { const names = [!env.IMPACT_ACCOUNT_SID && "IMPACT_ACCOUNT_SID", !env.IMPACT_AUTH_TOKEN && "IMPACT_AUTH_TOKEN"].filter(Boolean); return { name, state: "disabled", rows: [], audit:{reason:`${names.join(", ")} missing – Impact API sync skipped`} }; }
    if (name === "impact" && !impactDue) return { name, state: "disabled", rows: [], audit:{reason:`Impact rate-limit cooldown – next scheduled window every ${impactCadenceHours}h`, cadenceHours:impactCadenceHours} };
    if (name === "amazon" && (!env.AMAZON_CREATORS_CREDENTIAL_ID || !env.AMAZON_CREATORS_CREDENTIAL_SECRET || !env.AMAZON_PARTNER_TAG)) { const names = [!env.AMAZON_CREATORS_CREDENTIAL_ID && "AMAZON_CREATORS_CREDENTIAL_ID", !env.AMAZON_CREATORS_CREDENTIAL_SECRET && "AMAZON_CREATORS_CREDENTIAL_SECRET", !env.AMAZON_PARTNER_TAG && "AMAZON_PARTNER_TAG"].filter(Boolean); return { name, state: "disabled", rows: [], audit:{reason:`${names.join(", ")} missing – Amazon Creators API sync skipped`} }; }
    if (name === "awin-product-feeds" && !env.AWIN_DATAFEED_API_KEY) return { name, state: "disabled", rows: [], audit:{reason:"AWIN_DATAFEED_API_KEY missing – Awin Product Feed sync skipped"} };
    if (name === "awin-enhanced-feeds" && (!env.AWIN_API_TOKEN||!joined.length)) return {name,state:"disabled",rows:[],audit:{reason:!env.AWIN_API_TOKEN?"AWIN_API_TOKEN missing – Awin Enhanced Feed sync skipped":"No joined Awin programmes – Enhanced Feed sync skipped"}};
    if (name === "daisycon" && (!env.DAISYCON_PUBLISHER_ID || !env.DAISYCON_ACCESS_TOKEN)) return {name,state:"disabled",rows:[],audit:{reason:"DAISYCON_PUBLISHER_ID / DAISYCON_ACCESS_TOKEN missing – Daisycon sync skipped"}};
    if (name === "tradedoubler" && !env.TRADEDOUBLER_PRODUCTS_TOKEN && !env.TRADEDOUBLER_FEED_URLS) return {name,state:"disabled",rows:[],audit:{reason:"TRADEDOUBLER_PRODUCTS_TOKEN / TRADEDOUBLER_FEED_URLS missing – Tradedoubler sync skipped"}};
    if (name === "tradedoubler-vouchers" && !env.TRADEDOUBLER_VOUCHERS_TOKEN) return {name,state:"disabled",rows:[],audit:{reason:"TRADEDOUBLER_VOUCHERS_TOKEN missing – Tradedoubler voucher sync skipped"}};
    if (name === "webgains" && !env.WEBGAINS_FEED_URLS) return {name,state:"disabled",rows:[],audit:{reason:"WEBGAINS_FEED_URLS missing – Webgains feed sync skipped"}};
    try { const rows=await runSourceWithRetry(run,{attempts:Number(env.SOURCE_RETRY_ATTEMPTS)||2,baseDelayMs:Number(env.SOURCE_RETRY_BASE_DELAY_MS)||400}); return { name, state: "ok", rows, audit:rows.audit??null }; }
    catch (error) { return { name, state: "error", rows: [], error: String(error.message).slice(0, 160) }; }
  }));
  return {sources:results,awinPrograms,awinDiscoveryOffers,awinDiscoveryError,awinProgramDetails,daisyconPrograms,daisyconProgramError,daisyconMedia,daisyconProgramReviews,webgainsMemberships,webgainsMembershipError,webgainsProgramReviews};
}
