import { gunzipSync } from "node:zlib";

const FEED_LIST = "https://productdata.awin.com/datafeed/list/apikey";
const API = "https://api.awin.com";
const HTTP_TIMEOUT_MS = Math.min(60_000, Math.max(5_000, Number(process.env.SOURCE_HTTP_TIMEOUT_MS) || 12_000));
const timedFetch = (fetchImpl, url, options = {}) => fetchImpl(url, { ...options, signal: options.signal ?? AbortSignal.timeout(HTTP_TIMEOUT_MS) });

export function parseCsv(source, delimiter = ",") {
  const rows=[]; let row=[],field="",quoted=false;
  for(let i=0;i<source.length;i+=1){const char=source[i],next=source[i+1];if(char==='"'&&quoted&&next==='"'){field+='"';i+=1;}else if(char==='"'){if(!quoted&&field.length>0)throw new Error("Malformed Awin CSV: unexpected quote inside unquoted field");quoted=!quoted;}else if(char===delimiter&&!quoted){row.push(field);field="";}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&next==='\n')i+=1;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=char;}
  if(quoted)throw new Error("Malformed Awin CSV: unterminated quoted field");
  if(field||row.length){row.push(field);rows.push(row);} if(rows.length<2)return[];
  const headers=rows[0].map(value=>value.replace(/^\uFEFF/,"").trim());
  return rows.slice(1).map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??""])));
}

const pick=(row,...names)=>names.map(name=>row[name]).find(value=>String(value??"").trim())||null;
const joined=row=>/^(?:joined|active|beigetreten)$/i.test(String(pick(row,"Membership Status","membership_status")||"").trim());
const german=row=>/^(de|germany|deutschland)$/i.test(pick(row,"Primary Region","primary_region")||"")||/german|deutsch/i.test(pick(row,"Language","language")||"");

const allowedAwinFeedUrl=(value,mode="download",publisherId="")=>{
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||url.username||url.password||url.port||url.hash)return null;
    const path=url.pathname.toLowerCase();
    if(mode==="list"){
      // Awin's documented 2026 Create-a-Feed feed-list URL lives on ui.awin.com.
      // Do not accept any other ui.awin.com path or another publisher account.
      if(url.hostname==="ui.awin.com"){
        const m=/^\/productdata-darwin-download\/publisher\/([0-9]+)\/([^/]+)\/1\/feedlist$/i.exec(url.pathname);
        return m && publisherId && m[1]===String(publisherId) && !url.search ? url.href : null;
      }
      return url.hostname==="productdata.awin.com"
        && path.startsWith("/datafeed/list/apikey/")
        && path.length>"/datafeed/list/apikey/".length?url.href:null;
    }
    return ["datafeed.api.productserve.com","productdata.awin.com"].includes(url.hostname)
      && path.startsWith("/datafeed/download/apikey/")
      && path.length>"/datafeed/download/apikey/".length?url.href:null;
  }catch{return null;}
};
// Semicolon-delimited secret values; feed URLs themselves may contain encoded commas.
const parseConfiguredUrls=value=>String(value||"").split(";").map(x=>x.trim()).filter(Boolean);

// Awin confirmed classic/legacy feeds must be downloaded by complete account
// URLs from Toolbox > Create-a-Feed, NOT with the Enhanced Feed API token.
export async function fetchAwinProductFeeds({ apiKey, publisherId, feedListUrl, feedUrls, joinedAdvertiserIds=[], fetchImpl=fetch, maxFeeds=6, maxProducts=500 }) {
  const explicit=parseConfiguredUrls(feedUrls);
  if(explicit.length>0 && explicit.some(url=>!allowedAwinFeedUrl(url)))
    throw new Error("Untrusted Awin legacy download host or path");
  const authorizedIds=new Set(joinedAdvertiserIds.map(String));
  // Programme must be confirmed via the authenticated publisher API before
  // consuming either feed-list or direct feed URLs. Unknown membership fails closed.
  if(authorizedIds.size===0)return [];
  let feedRows=[];
  if(explicit.length>0){
    // Direct feed links are always limited to joined advertisers.
    if(authorizedIds.size===0)return[];
    feedRows=explicit.slice(0,maxFeeds).map((url,index)=>({URL:url,"Feed ID":`direct-${index+1}`}));
  }else{
    const listUrl=feedListUrl?allowedAwinFeedUrl(feedListUrl,"list",publisherId):apiKey?`${FEED_LIST}/${encodeURIComponent(apiKey)}`:null;
    if(!listUrl) { if(feedListUrl)throw new Error("Untrusted Awin feed-list URL"); return []; }
    const listResponse=await timedFetch(fetchImpl,listUrl,{redirect:"error"});
    if(!listResponse.ok)throw new Error(`Awin Product Feed List: HTTP ${listResponse.status}`);
    feedRows=parseCsv(await listResponse.text())
      .filter(row=>joined(row)&&german(row)&&/^(?:awin|legacy)?$/i.test(String(pick(row,"Datafeed Format","datafeed_format")||"").trim())&&allowedAwinFeedUrl(pick(row,"URL","url")))
      .filter(row=>authorizedIds.has(String(pick(row,"Advertiser ID","advertiser_id","merchant_id"))));
    // Give each joined advertiser one feed before taking extra feeds from the
    // same advertiser. The official list may contain several feeds per shop.
    const feedsByAdvertiser=new Map();
    for(const row of feedRows){
      const id=String(pick(row,"Advertiser ID","advertiser_id","merchant_id"));
      if(!feedsByAdvertiser.has(id))feedsByAdvertiser.set(id,[]);
      feedsByAdvertiser.get(id).push(row);
    }
    feedRows=[
      ...[...feedsByAdvertiser.values()].map(rows=>rows.shift()),
      ...[...feedsByAdvertiser.values()].flat()
    ].slice(0,maxFeeds);
  }
  const batches=[];
  for(const feed of feedRows){
    const batch=[];
    const response=await timedFetch(fetchImpl, pick(feed,"URL","url"),{redirect:"error"});
    if(!response.ok)continue;
    const bytes=Buffer.from(await response.arrayBuffer());
    let text; try{text=gunzipSync(bytes).toString("utf8");}catch{text=bytes.toString("utf8");}
    for(const row of parseCsv(text)){
      if(batch.length>=maxProducts)break;
      if(!authorizedIds.has(String(pick(row,"merchant_id","Advertiser ID","advertiser_id"))))continue;
      const tracking=pick(row,"aw_deep_link","deep_link"); const destination=pick(row,"merchant_deep_link","deep_link", "aw_deep_link");
      if(!tracking||!destination)continue;
      batch.push({source:"awin",id:`feed-${pick(feed,"Feed ID","feed_id")}-${pick(row,"aw_product_id","product_id","merchant_product_id")}`,title:pick(row,"product_name","name"),description:pick(row,"product_short_description","description"),url:destination,urlTracking:tracking,advertiserName:pick(row,"merchant_name","Advertiser Name"),advertiserId:pick(row,"merchant_id","Advertiser ID"),regions:{list:[{countryCode:"DE"}]},type:"promotion",imageUrl:pick(row,"aw_image_url","large_image","merchant_image_url","image_url"),imageAlt:pick(row,"product_name","name"),imageSource:pick(row,"aw_image_url")?"Awin Image Resize & Caching":"Awin Product Feed",imageRightsNote:"Vom freigegebenen Advertiser im Awin-Produktfeed bereitgestellt; Awin-Cache wird bevorzugt, wenn verfügbar.",currentPrice:pick(row,"search_price","price"),previousPrice:pick(row,"rrp_price","product_price_old"),currency:pick(row,"currency")||"EUR",brand:pick(row,"brand_name"),productId:pick(row,"product_GTIN","ean","mpn","aw_product_id","product_id"),gtin:pick(row,"product_GTIN"),ean:pick(row,"ean"),mpn:pick(row,"mpn"),availability:pick(row,"stock_status","in_stock"),category:undefined});
    }
    batches.push(batch);
  }
  // A large first feed must not exhaust the product cap before other approved
  // advertisers are represented. Interleave accepted rows without fabricating data.
  const products=[];
  for(let index=0;products.length<maxProducts;index++){
    let added=false;
    for(const batch of batches){
      if(products.length>=maxProducts)break;
      if(index<batch.length){products.push(batch[index]);added=true;}
    }
    if(!added)break;
  }
  return products;
}

const numberWithCurrency=value=>{const match=String(value??"").match(/([0-9]+(?:[.,][0-9]+)?)\s*([A-Z]{3})?/i);return match?{amount:match[1].replace(",","."),currency:(match[2]||"EUR").toUpperCase()}:{amount:null,currency:"EUR"};};
const plainObject=value=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
const section=(row,name)=>plainObject(row?.[name])?row[name]:{};
const trackingFromEnhancedRow=row=>{
  for(const container of [row,section(row,"product_basic"),...Object.values(row??{}).filter(plainObject)]){
    const tracking=container?.aw_deep_link??container?.tracking_link??container?.link_tracking;
    if(String(tracking??"").trim())return tracking;
  }
  return null;
};
export const enhancedProduct=(row,advertiser)=>{
  const basic=section(row,"product_basic");
  const pricing=section(row,"price_and_availability");
  const identifiers=section(row,"product_identifiers");
  const category=section(row,"product_category");
  const id=basic.id??row.id;
  const title=basic.title??row.title;
  const description=basic.description??row.description;
  const link=basic.link??row.link;
  const imageLink=basic.image_link??row.image_link;
  const additionalImages=basic.additional_image_link??row.additional_image_link;
  const salePrice=pricing.sale_price??row.sale_price;
  const regularPrice=pricing.price??row.price;
  const current=numberWithCurrency(salePrice??regularPrice);
  const original=numberWithCurrency(regularPrice);
  const tracking=trackingFromEnhancedRow(row);
  const brand=identifiers.brand??row.brand;
  const gtin=identifiers.gtin??row.gtin;
  const mpn=identifiers.mpn??row.mpn;
  const availability=pricing.availability??row.availability;
  return {source:"awin",id:`enhanced-${advertiser.id}-${id}`,title,description,url:link,urlTracking:tracking,
    advertiserName:advertiser.name,advertiserId:advertiser.id,regions:{list:[{countryCode:"DE"}]},type:"promotion",
    imageUrl:Array.isArray(imageLink)?imageLink[0]:imageLink,additionalImageUrls:additionalImages,imageAlt:title,imageSource:"Awin Enhanced Product Feed",
    imageRightsNote:"Vom freigegebenen Advertiser im offiziellen Awin-Produktfeed bereitgestellt.",currentPrice:current.amount,
    previousPrice:salePrice?original.amount:null,currency:current.currency,brand,productId:gtin??mpn??id,
    gtin,ean:gtin,mpn,availability,category:category.product_type??category.google_product_category??undefined};
};

export async function fetchAwinEnhancedFeeds({ publisherId, token, advertisers=[], fetchImpl=fetch, maxProducts=500 }) {
  if(!publisherId||!token||!advertisers.length)return {products:[],feeds:[]};
  const products=[]; const feeds=[];
  // Give every joined advertiser a fair share instead of starving advertisers
  // that happen to sort after the first two or after a large catalog.
  const perAdvertiserLimit=Math.max(1,Math.ceil(maxProducts/advertisers.length));
  for(const advertiser of advertisers){
    let advertiserImported=0;
    for(const locale of ["de_DE","en_DE"]){
      const endpoint=`${API}/publishers/${encodeURIComponent(publisherId)}/awinfeeds/download/${encodeURIComponent(advertiser.id)}-retail-${locale}.jsonl`;
      const response=await timedFetch(fetchImpl, endpoint,{headers:{Authorization:`Bearer ${token}`}});
      if(response.status===404){feeds.push({advertiserId:advertiser.id,advertiserName:advertiser.name,locale,state:"not-found"});continue;}
      if(!response.ok){feeds.push({advertiserId:advertiser.id,advertiserName:advertiser.name,locale,state:`http-${response.status}`});continue;}
      const lines=(await response.text()).split(/\r?\n/).filter(Boolean);
      // Awin can return HTTP 200, then end a truncated JSONL stream with an
      // {"error": ...} row. Never publish products from that incomplete feed,
      // even if the product limit would stop parsing before the terminal row.
      let terminalRow;
      try { terminalRow=JSON.parse(lines.at(-1)??"null"); } catch { terminalRow=null; }
      if(terminalRow && typeof terminalRow==="object" && Object.hasOwn(terminalRow,"error")){
        feeds.push({advertiserId:advertiser.id,advertiserName:advertiser.name,locale,state:"incomplete",products:0,rejectionReasons:{"feed-error-row":1}});
        continue;
      }
      const localeProducts=[];
      let incomplete=false;
      let imported=0; const audit={rawProducts:lines.length,validProducts:0,withPrice:0,withImage:0,withTracking:0,rejected:0,rejectionReasons:{}};
      const reject=(reason)=>{audit.rejected+=1;audit.rejectionReasons[reason]=(audit.rejectionReasons[reason]||0)+1;};
      for(const line of lines){if(products.length+localeProducts.length>=maxProducts||advertiserImported>=perAdvertiserLimit)break;let row;try{row=JSON.parse(line);}catch{reject("invalid-json");continue;}if(row && typeof row==="object" && Object.hasOwn(row,"error")){reject("feed-error-row");incomplete=true;break;}const product=enhancedProduct(row,advertiser);if(Number(product.currentPrice)>0)audit.withPrice+=1;if(product.imageUrl)audit.withImage+=1;if(product.urlTracking)audit.withTracking+=1;const reasons=[];if(!product.title||!product.productId)reasons.push("missing-product-identity");if(!product.url||!product.urlTracking)reasons.push("missing-affiliate-link");if(reasons.length){reasons.forEach(reject);continue;}audit.validProducts+=1;localeProducts.push(product);imported+=1;advertiserImported+=1;}
      if(incomplete){
        feeds.push({advertiserId:advertiser.id,advertiserName:advertiser.name,locale,state:"incomplete",products:0,...audit});
        advertiserImported-=localeProducts.length;
        continue;
      }
      products.push(...localeProducts);
      feeds.push({advertiserId:advertiser.id,advertiserName:advertiser.name,locale,state:"available",products:imported,...audit});
      if(imported)break;
    }
  }
  return {products,feeds};
}
