// Spotlight selection is a display-only layer. No prices, discounts, feed
// permissions, affiliate links or product IDs are fabricated or rewritten.
const accessoryPattern=/\b(?:pin|pins|anstecknadel|geschenkkarte|gift\s*card|gutschein|verlängerungskabel|adapter|ladestation|ladegerät|charger|kabel|cable|battery|batterie|akku|halterung|mount|strap|tasche|bag|klinge|blade|set\s+of\s+filters|ersatzteil|spare\s*part|spare\s*parts|schutzfolie|screen\s*protector|case|cover|stativ|tripod|wartungsset|schraube|nozzle|reinigungsbürste|karton|4g[- ]service)\b/i;
const primaryProductPattern=/\b(?:mähroboter|rasenroboter|roboter|lawn\s*mower|kaffeemaschine|espresso(?:maschine)?|coffee\s*maker|mikrofon|microphone|funkstrecke|wireless|video\s*transmitter|monitor|kamera|camera|intercom|transceiver|sender|empfänger|receiver|headset|lautsprecher|speaker|recorder|mixer|smartphone|tablet|computer|laptop|projektor|projector|streaming|lark|pyro|cosmo|mars|solidcom|syscom|genie|lattogo|nano|n8\b|m5\b)\b/i;

export const polishOfferTitle=title=>{
  const name=String(title||"").trim().replace(/\s+/g," ");
  if(/^site-wide 5% off$/i.test(name))return "5 % Rabatt auf den Shop – laut Anbieter";
  if(/^10% off eu only$/i.test(name))return "10 % Rabatt für EU-Bestellungen – laut Anbieter";
  if(/^60% lifetime sale: pdf agile:/i.test(name))return "PDF Agile – Lifetime-Aktion laut Anbieter";
  return name
    .replace(/\bStromapter\b/gi,"Stromadapter")
    .replace(/\bM Series\b/g,"M-Serie")
    .replace(/\bJubil_um\b/g,"Jubiläum");
};
export const isSpotlightProduct=offer=>{
  const title=String(offer?.title||"");
  const price=Number(offer?.currentPrice);
  // Awin normalizes even real products to type="promotion". The product ID,
  // image, price and authorized tracking link prove this is a real product.
  if(!offer||!offer.productId||offer.voucherCode||
    !offer.imageUrl||!offer.trackingUrl||!Number.isFinite(price)||
    price<49||price>3000)return false;
  if(["zubehoer","sonstiges"].includes(String(offer.category||"")))return false;
  if(accessoryPattern.test(title))return false;
  return primaryProductPattern.test(title);
};
const score=offer=>{
  const title=String(offer.title||"");
  const price=Number(offer.currentPrice);
  return (primaryProductPattern.test(title)?100:0)
   + (price>=99&&price<=1250?60:0)
   + (price>=249&&price<=999?20:0)
   + (offer.category==="gaming"||offer.category==="computer"||offer.category==="haushalt"||offer.category==="garten"?35:0)
   + (offer.gtin||offer.ean||offer.mpn?12:0)
   + (offer.brand?8:0)
   + (Number.isFinite(offer.previousPrice)&&offer.previousPrice>price?25:0);
};

export function selectSpotlightProducts(offers,limit=12){
  if(!Number.isInteger(limit)||limit<=0)return[];
  const ranked=offers.filter(isSpotlightProduct).sort((a,b)=>
    score(b)-score(a)||String(a.id||a.slug).localeCompare(String(b.id||b.slug),"de"));
  const selected=[],ids=new Set(),merchants=new Set(),categories=new Set();
  const key=offer=>String(offer.id||offer.slug||offer.title);
  const take=offer=>{const k=key(offer);if(ids.has(k))return;selected.push(offer);ids.add(k);merchants.add(offer.advertiser);categories.add(offer.category);};
  // The hero should represent different merchants before repeating the same brand.
  for(const offer of ranked){if(selected.length>=limit)break;if(!merchants.has(offer.advertiser))take(offer);}
  for(const offer of ranked){if(selected.length>=limit)break;if(!categories.has(offer.category))take(offer);}
  for(const offer of ranked){if(selected.length>=limit)break;take(offer);}
  return selected;
}
