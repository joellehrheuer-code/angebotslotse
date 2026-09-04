const API = "https://api.impact.com";

export async function fetchImpactOffers({ accountSid, authToken, fetchImpl = fetch }) {
  if (!accountSid || !authToken) return [];
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const collected = [];
  let page = 1;
  for (;;) {
    const url = `${API}/Mediapartners/${encodeURIComponent(accountSid)}/Promotions?Page=${page}&PageSize=1000`;
    const response = await fetchImpl(url, { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`Impact Promotions API: HTTP ${response.status}`);
    const payload = await response.json();
    const rows = payload.Promotions ?? payload.Records ?? [];
    for (const row of rows) {
      const [startDate, endDate] = String(row.PromotionEffectiveDates ?? "").split("/");
      const trackingUrl = row.TrackingLink ?? row.TrackingUrl ?? row.Url;
      if (!trackingUrl) continue;
      collected.push({ id: row.PromotionId ?? row.PromotionIds, title: row.PromotionTitle, description: row.PromotionDescription,
        terms: row.Terms, url: row.LandingPageUrl ?? row.Url ?? trackingUrl, urlTracking: trackingUrl,
        advertiserName: row.AdvertiserName, advertiserId: row.AdvertiserId, type: row.GenericRedemptionCode ? "voucher" : "promotion",
        voucher: row.GenericRedemptionCode ? { code: row.GenericRedemptionCode } : undefined,
        startDate, endDate, regions: { all: true }, source: "impact" });
    }
    const pages = Number(payload["@numpages"] ?? 1);
    if (page >= pages) break;
    page += 1;
  }
  return collected;
}
