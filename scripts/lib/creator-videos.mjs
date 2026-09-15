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
