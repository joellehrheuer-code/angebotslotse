const clean=value=>String(value??"").trim();
const merchantName=row=>clean(row?.advertiserName??row?.advertiser?.name??row?.advertiser??"Unbekannt");
const signature=(...parts)=>parts.map(part=>clean(part).toLowerCase()).join("|");

const countDuplicateExtras=values=>{
  const counts=new Map();
  for(const value of values.filter(Boolean))counts.set(value,(counts.get(value)||0)+1);
  return [...counts.values()].reduce((sum,count)=>sum+Math.max(0,count-1),0);
};

export function buildEnhancedFeedDedupeDiagnostics({rawRows=[],preNormalizedOffers=[],normalizedOffers=[],rejectionReasonForRow=()=>null}={}){
  const enhancedRaw=rawRows.filter(row=>String(row?.id??"").startsWith("enhanced-"));
  const enhancedPreNormalized=preNormalizedOffers.filter(row=>String(row?.sourceId??"").startsWith("enhanced-"));
  const enhancedNormalized=normalizedOffers.filter(row=>String(row?.sourceId??"").startsWith("enhanced-"));
  const merchants=[...new Set([...enhancedRaw.map(merchantName),...enhancedPreNormalized.map(merchantName),...enhancedNormalized.map(merchantName)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,"de"));
  const byMerchant=merchants.map(merchant=>{
    const raw=enhancedRaw.filter(row=>merchantName(row)===merchant);
    const pre=enhancedPreNormalized.filter(row=>merchantName(row)===merchant);
    const out=enhancedNormalized.filter(row=>merchantName(row)===merchant);
    const gtins=raw.map(row=>clean(row.gtin??row.ean)).filter(Boolean).map(value=>signature(merchant,value));
    const mpns=raw.filter(row=>clean(row.mpn)).map(row=>signature(merchant,row.mpn,row.brand));
    const ids=raw.map(row=>clean(row.id)).filter(Boolean);
    const rejectionReasons=Object.fromEntries([...raw.filter(row=>!pre.some(item=>String(item.sourceId??"")===String(row.id??""))).reduce((counts,row)=>{
      const reason=clean(rejectionReasonForRow(row))||"unknown";
      counts.set(reason,(counts.get(reason)||0)+1);
      return counts;
    },new Map())].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])));
    return {
      merchant,
      inputRows:raw.length,
      normalizedRows:pre.length,
      filteredBeforeDedupe:Math.max(0,raw.length-pre.length),
      outputOffers:out.length,
      dedupedRows:Math.max(0,pre.length-out.length),
      collapsedRows:Math.max(0,raw.length-out.length),
      rowsWithGtin:gtins.length,
      duplicateGtinExtras:countDuplicateExtras(gtins),
      rowsWithMpn:mpns.length,
      duplicateMpnExtras:countDuplicateExtras(mpns),
      duplicateSourceIdExtras:countDuplicateExtras(ids),
      rejectionReasons
    };
  });
  return {
    inputRows:enhancedRaw.length,
    normalizedRows:enhancedPreNormalized.length,
    filteredBeforeDedupe:Math.max(0,enhancedRaw.length-enhancedPreNormalized.length),
    outputOffers:enhancedNormalized.length,
    dedupedRows:Math.max(0,enhancedPreNormalized.length-enhancedNormalized.length),
    collapsedRows:Math.max(0,enhancedRaw.length-enhancedNormalized.length),
    byMerchant
  };
}
