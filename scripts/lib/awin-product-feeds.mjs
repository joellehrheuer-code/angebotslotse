import { gunzipSync } from "node:zlib";

const FEED_LIST = "https://productdata.awin.com/datafeed/list/apikey";

export function parseCsv(source, delimiter = ",") {
  const rows=[]; let row=[],field="",quoted=false;
  for(let i=0;i<source.length;i+=1){const char=source[i],next=source[i+1];if(char==='"'&&quoted&&next==='"'){field+='"';i+=1;}else if(char==='"'){quoted=!quoted;}else if(char===delimiter&&!quoted){row.push(field);field="";}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&next==='\n')i+=1;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field="";}else field+=char;}
  if(field||row.length){row.push(field);rows.push(row);} if(rows.length<2)return[];
  const headers=rows[0].map(value=>value.replace(/^\uFEFF/,"").trim());
  return rows.slice(1).map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??""])));
}

const pick=(row,...names)=>names.map(name=>row[name]).find(value=>String(value??"").trim())||null;
const joined=row=>/joined|beigetreten|active/i.test(pick(row,"Membership Status","membership_status")||"");
const german=row=>/^(de|germany|deutschland)$/i.test(pick(row,"Primary Region","primary_region")||"")||/german|deutsch/i.test(pick(row,"Language","language")||"");

export async function fetchAwinProductFeeds({ apiKey, fetchImpl=fetch, maxFeeds=6, maxProducts=500 }) {
  if(!apiKey)return[];
  const listResponse=await fetchImpl(`${FEED_LIST}/${encodeURIComponent(apiKey)}`);
  if(!listResponse.ok)throw new Error(`Awin Product Feed List: HTTP ${listResponse.status}`);
  const feedRows=parseCsv(await listResponse.text()).filter(row=>joined(row)&&german(row)&&pick(row,"URL","url")).slice(0,maxFeeds);
  const products=[];
  for(const feed of feedRows){
    if(products.length>=maxProducts)break;
    const response=await fetchImpl(pick(feed,"URL","url"));
    if(!response.ok)continue;
    const bytes=Buffer.from(await response.arrayBuffer());
    let text; try{text=gunzipSync(bytes).toString("utf8");}catch{text=bytes.toString("utf8");}
    for(const row of parseCsv(text).slice(0,maxProducts-products.length)){
      const tracking=pick(row,"aw_deep_link","deep_link"); const destination=pick(row,"merchant_deep_link","deep_link", "aw_deep_link");
      if(!tracking||!destination)continue;
      products.push({source:"awin",id:`feed-${pick(feed,"Feed ID","feed_id")}-${pick(row,"aw_product_id","product_id","merchant_product_id")}`,title:pick(row,"product_name","name"),description:pick(row,"product_short_description","description"),url:destination,urlTracking:tracking,advertiserName:pick(row,"merchant_name","Advertiser Name"),advertiserId:pick(row,"merchant_id","Advertiser ID"),regions:{list:[{countryCode:"DE"}]},type:"promotion",imageUrl:pick(row,"large_image","aw_image_url","merchant_image_url","image_url"),imageAlt:pick(row,"product_name","name"),imageSource:"Awin Product Feed",imageRightsNote:"Vom freigegebenen Advertiser im Awin-Produktfeed bereitgestellt.",currentPrice:pick(row,"search_price","price"),previousPrice:pick(row,"rrp_price","product_price_old"),currency:pick(row,"currency")||"EUR",brand:pick(row,"brand_name"),productId:pick(row,"product_GTIN","ean","mpn","aw_product_id","product_id"),gtin:pick(row,"product_GTIN"),ean:pick(row,"ean"),mpn:pick(row,"mpn"),availability:pick(row,"stock_status","in_stock"),category:undefined});
    }
  }
  return products;
}
