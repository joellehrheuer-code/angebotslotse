const allowedTypes = new Set(["video","post","stream","music","community"]);

import { repairCreatorText, deriveCreatorThumbnail } from "./creator-media.mjs";

const isPublicHttpsUrl = value => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
};

const cleanText = (value, maxLength) => repairCreatorText(value).slice(0, maxLength);

export function sanitizeCreatorFeedItems(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input.map(item => {
    if (!item || typeof item !== "object") return null;
    const id = cleanText(item.id, 160);
    const type = cleanText(item.type || "post", 24).toLowerCase();
    const title = cleanText(item.title, 180);
    const summary = cleanText(item.summary || item.description || "", 420);
    const platform = cleanText(item.platform, 40);
    const publicUrl = String(item.publicUrl || "").trim();
    const suppliedThumbnail = String(item.thumbnailUrl || "").trim();
    const thumbnailUrl = suppliedThumbnail || deriveCreatorThumbnail(publicUrl, platform) || "";
    const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
    if (!id || seen.has(id) || !allowedTypes.has(type) || !title || !platform || !isPublicHttpsUrl(publicUrl)) return null;
    if (thumbnailUrl && !isPublicHttpsUrl(thumbnailUrl)) return null;
    if (item.publishedAt && (!publishedAt || Number.isNaN(publishedAt.getTime()))) return null;
    seen.add(id);
    return {
      id,
      type,
      title,
      summary: summary || null,
      platform,
      publicUrl,
      thumbnailUrl: thumbnailUrl || null,
      publishedAt: publishedAt ? publishedAt.toISOString() : null
    };
  }).filter(Boolean);
}

export async function fetchCreatorSocialFeed({ feedUrl, fetchImpl = fetch, maxItems = 24 } = {}) {
  if (!feedUrl) return { state: "disabled", items: [], updatedAt: null };
  let url;
  try {
    url = new URL(String(feedUrl));
  } catch {
    throw new Error("Creator social feed URL is invalid");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Creator social feed URL must be public HTTPS without embedded credentials");
  }

  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`Creator social feed: HTTP ${response.status}`);

  const payload = await response.json();
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.videos)
        ? payload.videos.map(item => ({ ...item, type: "video" }))
        : null;
  if (!Array.isArray(raw)) throw new Error("Creator social feed must contain an items or videos array");

  const items = sanitizeCreatorFeedItems(raw)
    .sort((a,b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
    .slice(0, Math.min(50, Math.max(1, Number(maxItems) || 24)));

  return {
    state: "ok",
    updatedAt: payload?.updatedAt && Number.isFinite(new Date(payload.updatedAt).valueOf())
      ? new Date(payload.updatedAt).toISOString()
      : new Date().toISOString(),
    items
  };
}
