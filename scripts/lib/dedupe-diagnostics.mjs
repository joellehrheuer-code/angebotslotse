const clean=value=>String(value??"").trim();
const merchantName=row=>clean(row?.advertiserName??row?.advertiser?.name??row?.advertiser??"Unbekannt");
const signature=(...parts)=>parts.map(part=>clean(part).toLowerCase()).join("|");

const countDuplicateExtras=values=>{
  const counts=new Map();
  for(const value of values.filter(Boolean))counts.set(value,(counts.get(value)||0)+1);
  return [...counts.values()].reduce((sum,count)=>sum+Math.max(0,count-1),0);
};

export function buildEnhancedFeedDedupeDiagnostics({rawRows=[],normalizedOffers=[]}={}){
  const enhancedRaw=rawRows.filter(row=>String(row?.id??"").startsWith("enhanced-"));
  const enhancedNormalized=normalizedOffers.filter(row=>String(row?.sourceId??"").startsWith("enhanced-"));
  const merchants=[...new Set([...enhancedRaw.map(merchantName),...enhancedNormalized.map(merchantName)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,"de"));
  const byMerchant=merchants.map(merchant=>{
    const raw=enhancedRaw.filter(row=>merchantName(row)===merchant);
    const out=enhancedNormalized.filter(row=>merchantName(row)===merchant);
    const gtins=raw.map(row=>clean(row.gtin??row.ean)).filter(Boolean).map(value=>signature(merchant,value));
    const mpns=raw.filter(row=>clean(row.mpn)).map(row=>signature(merchant,row.mpn,row.brand));
    const ids=raw.map(row=>clean(row.id)).filter(Boolean);
    return {
      merchant,
      inputRows:raw.length,
      outputOffers:out.length,
      collapsedRows:Math.max(0,raw.length-out.length),
      rowsWithGtin:gtins.length,
      duplicateGtinExtras:countDuplicateExtras(gtins),
      rowsWithMpn:mpns.length,
      duplicateMpnExtras:countDuplicateExtras(mpns),
      duplicateSourceIdExtras:countDuplicateExtras(ids)
    };
  });
  return {
    inputRows:enhancedRaw.length,
    outputOffers:enhancedNormalized.length,
    collapsedRows:Math.max(0,enhancedRaw.length-enhancedNormalized.length),
    byMerchant
  };
}
