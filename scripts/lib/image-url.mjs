// Optimize image requests only when the source provider documents the width query.
// For other providers, retain the verified source URL exactly as supplied.
export const optimizedImageUrl = (src, width = 640) => {
  try {
    const parsed = new URL(src);
    const shopify = (parsed.hostname === "cdn.shopify.com" || parsed.hostname.endsWith(".myshopify.com"))
      && parsed.pathname.includes("/s/files/");
    if (shopify && parsed.protocol === "https:") {
      const requestedWidth = Number(width);
      if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1 || requestedWidth > 1920) return src;
      const raw = parsed.searchParams.get("width");
      const existing = raw ? Number(raw) : null;
      if (existing === null || !Number.isFinite(existing) || existing > requestedWidth) {
        parsed.searchParams.set("width", String(requestedWidth));
      }
      return parsed.toString();
    }
  } catch {}
  return src;
};
