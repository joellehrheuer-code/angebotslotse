// Count actual distinct merchants, never the number of listings for a product.
export function countDistinctMerchants(offer, alternatives = []) {
  const names = [offer, ...alternatives]
    .map(row => String(row?.advertiser ?? "").trim().toLocaleLowerCase("de-DE"))
    .filter(Boolean);
  return new Set(names).size;
}
