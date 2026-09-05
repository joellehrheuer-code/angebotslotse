const API = "https://api.awin.com";

export const formatAwinDateTime = value => new Date(value).toISOString().slice(0, 19);

export async function fetchAwinOffers({ publisherId, token, fetchImpl = fetch }) {
  if (!publisherId || !token) throw new Error("AWIN_PUBLISHER_ID und AWIN_API_TOKEN sind erforderlich.");
  const collected = [];
  let page = 1;
  for (;;) {
    const query = new URLSearchParams({ accessToken: token });
    const response = await fetchImpl(`${API}/publisher/${encodeURIComponent(publisherId)}/promotions?${query}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { membership: "joined", regionCodes: ["DE"], status: "active", type: "all" }, pagination: { page, pageSize: 200 } })
    });
    if (!response.ok) throw new Error(`Awin Offers API: HTTP ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : (payload.promotions ?? payload.data ?? []);
    collected.push(...rows);
    const totalPages = Number(payload.pagination?.totalPages ?? payload.totalPages ?? 1);
    if (!rows.length || page >= totalPages) break;
    page += 1;
    await new Promise(resolve => setTimeout(resolve, 3100));
  }
  return collected;
}

export async function fetchAwinTransactions({ publisherId, token, startDate, endDate, fetchImpl = fetch }) {
  const query = new URLSearchParams({ accessToken: token, startDate, endDate, timezone: "Europe/Berlin" });
  const response = await fetchImpl(`${API}/publishers/${encodeURIComponent(publisherId)}/transactions/?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Awin Transactions API: HTTP ${response.status}`);
  return response.json();
}
