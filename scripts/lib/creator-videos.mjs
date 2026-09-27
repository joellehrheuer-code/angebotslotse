const isPublicHttpsUrl = value => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
};

const cleanText = (value, maxLength) => String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);

export function sanitizeCreatorVideos(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input.map(item => {
    if (!item || typeof item !== "object") return null;
    const id = cleanText(item.id, 160);
    const title = cleanText(item.title, 180);
    const publicUrl = String(item.publicUrl || "").trim();
    const platform = cleanText(item.platform, 40);
    const thumbnailUrl = String(item.thumbnailUrl || "").trim();
    const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
    if (!id || seen.has(id) || !title || !platform || !isPublicHttpsUrl(publicUrl)) return null;
    if (thumbnailUrl && !isPublicHttpsUrl(thumbnailUrl)) return null;
    if (item.publishedAt && (!publishedAt || Number.isNaN(publishedAt.getTime()))) return null;
    seen.add(id);
    return {
      id,
      title,
      thumbnailUrl: thumbnailUrl || null,
      publicUrl,
      platform,
      publishedAt: publishedAt ? publishedAt.toISOString() : null
    };
  }).filter(Boolean);
}


export async function fetchCreatorVideoFeed({ feedUrl, fetchImpl = fetch, maxVideos = 12 } = {}) {
  if (!feedUrl) return { state: "disabled", videos: [], updatedAt: null };
  let url;
  try {
    url = new URL(String(feedUrl));
  } catch {
    throw new Error("Creator feed URL is invalid");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Creator feed URL must be public HTTPS without embedded credentials");
  }

  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`Creator feed: HTTP ${response.status}`);

  const payload = await response.json();
  const raw = Array.isArray(payload) ? payload : payload?.videos;
  if (!Array.isArray(raw)) throw new Error("Creator feed must contain a videos array");

  const videos = sanitizeCreatorVideos(raw)
    .sort((a,b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
    .slice(0, Math.min(30, Math.max(1, Number(maxVideos) || 12)));

  return {
    state: "ok",
    updatedAt: payload?.updatedAt && Number.isFinite(new Date(payload.updatedAt).valueOf())
      ? new Date(payload.updatedAt).toISOString()
      : new Date().toISOString(),
    videos
  };
}
