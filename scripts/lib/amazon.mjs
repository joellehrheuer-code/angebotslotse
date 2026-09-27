const TOKEN_URL="https://api.amazon.co.uk/auth/o2/token";
const API_URL="https://creatorsapi.amazon/catalog/v1/getItems";
const MARKETPLACE="www.amazon.de";

const resources=[
  "images.primary.large",
  "images.primary.medium",
  "images.variants.large",
  "itemInfo.title",
  "itemInfo.byLineInfo",
  "itemInfo.features",
  "offersV2.listings.availability",
  "offersV2.listings.dealDetails",
  "offersV2.listings.merchantInfo",
  "offersV2.listings.price"
];

const chunks=(rows,size)=>Array.from({length:Math.ceil(rows.length/size)},(_,i)=>rows.slice(i*size,(i+1)*size));

export async function getAmazonAccessToken({credentialId,credentialSecret,fetchImpl=fetch}){
  if(!credentialId||!credentialSecret)throw new Error("Amazon Creators API credentials fehlen.");
  const response=await fetchImpl(TOKEN_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({grant_type:"client_credentials",client_id:credentialId,client_secret:credentialSecret,scope:"creatorsapi::default"})
  });
  if(!response.ok)throw new Error(`Amazon OAuth: HTTP ${response.status}`);
  const payload=await response.json();
  if(!payload.access_token)throw new Error("Amazon OAuth lieferte kein Access-Token.");
  return payload.access_token;
}

function normalizeAmazonItem(item,definition={}){
  const listing=item?.offersV2?.listings?.[0]??null;
  const price=listing?.price?.money??null;
  const basis=listing?.price?.savingBasis?.money??null;
  const primary=item?.images?.primary?.large?.url??item?.images?.primary?.medium?.url??null;
  const variants=(item?.images?.variants??[]).map(image=>image?.large?.url??image?.medium?.url).filter(Boolean);
  const features=item?.itemInfo?.features?.displayValues??[];
  const title=item?.itemInfo?.title?.displayValue??definition.title??item?.asin;
  const brand=item?.itemInfo?.byLineInfo?.brand?.displayValue??null;
  const detail=item?.detailPageURL??`https://www.amazon.de/dp/${item?.asin}`;
  return {
    source:"amazon",
    promotionId:item?.asin,
    id:item?.asin,
    productId:item?.asin,
    asin:item?.asin,
    title,
    description:Array.isArray(features)?features.slice(0,4).join(" · "):"",
    advertiser:{name:listing?.merchantInfo?.name??"Amazon.de",joined:true},
    advertiserName:listing?.merchantInfo?.name??"Amazon.de",
    url:detail,
    urlTracking:detail,
    regions:{list:[{countryCode:"DE"}]},
    category:definition.category??"sonstiges",
    currentPrice:price?.amount??null,
    previousPrice:basis?.amount??null,
    currency:price?.currency??basis?.currency??"EUR",
    imageUrl:primary,
    additionalImageUrls:variants,
    imageAlt:title,
    imageSource:"Amazon Creators API",
    imageRightsNote:"Offizielles Amazon-Creators-API-Medium; Nutzung gemäß Amazon Associates Program Policies.",
    brand,
    availability:listing?.availability?.type??null,
    startDate:listing?.dealDetails?.startTime??null,
    endDate:listing?.dealDetails?.endTime??null,
    priceSource:price?"Amazon Creators API OffersV2":null
  };
}

export async function fetchAmazonCreatorItems({
  credentialId,
  credentialSecret,
  partnerTag,
  definitions=[],
  fetchImpl=fetch
}={}){
  if(!credentialId||!credentialSecret||!partnerTag)return [];
  const clean=definitions.filter(row=>/^[A-Z0-9]{10}$/.test(String(row?.asin??"").toUpperCase())).map(row=>({...row,asin:String(row.asin).toUpperCase()}));
  if(!clean.length)return [];
  const accessToken=await getAmazonAccessToken({credentialId,credentialSecret,fetchImpl});
  const output=[];
  for(const group of chunks(clean,10)){
    const response=await fetchImpl(API_URL,{
      method:"POST",
      headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json","x-marketplace":MARKETPLACE},
      body:JSON.stringify({
        itemIds:group.map(row=>row.asin),
        itemIdType:"ASIN",
        marketplace:MARKETPLACE,
        partnerTag,
        languagesOfPreference:["de_DE"],
        currencyOfPreference:"EUR",
        resources
      })
    });
    if(!response.ok)throw new Error(`Amazon Creators API GetItems: HTTP ${response.status}`);
    const payload=await response.json();
    const byAsin=new Map(group.map(row=>[row.asin,row]));
    for(const item of payload?.itemsResult?.items??[])output.push(normalizeAmazonItem(item,byAsin.get(item.asin)??{}));
  }
  return output;
}

export const AMAZON_CREATORS_API={tokenUrl:TOKEN_URL,apiUrl:API_URL,marketplace:MARKETPLACE,resources};
