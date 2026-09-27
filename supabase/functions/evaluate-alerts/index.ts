import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const SECRET_KEY = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FEED_URL = "https://joellehrheuer-code.github.io/angebotslotse/alerts-feed.json";
const MAX_MATCHES_PER_RULE = 12;

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();
const positive = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const discountPercent = (offer: any) => {
  const current = positive(offer?.currentPrice);
  const previous = positive(offer?.previousPrice);
  return current && previous && previous > current
    ? Math.round((1 - current / previous) * 100)
    : 0;
};
const offerRank = (offer: any) =>
  discountPercent(offer) * 1_000_000 + (Date.parse(String(offer?.updatedAt || "")) || 0) / 1_000_000;

function matches(subscription: any, offer: any) {
  if (!subscription?.enabled || !offer) return false;
  const type = norm(subscription.alert_type);
  const haystack = [
    norm(offer.title),
    norm(offer.description),
    norm(offer.brand),
    norm(offer.advertiser),
    norm(offer.category)
  ].join(" ");
  let identity = false;
  if (type === "product") {
    identity = [offer.id, offer.slug].some((value) => norm(value) && norm(value) === norm(subscription.query));
  } else if (type === "category") {
    identity = norm(offer.category) === norm(subscription.category ?? subscription.query);
  } else if (type === "brand") {
    identity = norm(offer.brand) === norm(subscription.brand ?? subscription.query);
  } else if (type === "merchant") {
    identity = norm(offer.advertiser) === norm(subscription.merchant ?? subscription.query);
  } else if (type === "search") {
    identity = Boolean(norm(subscription.query)) && haystack.includes(norm(subscription.query));
  }
  if (!identity) return false;

  const maxPrice = positive(subscription.max_price);
  if (maxPrice != null) {
    const current = positive(offer.currentPrice);
    if (current == null || current > maxPrice) return false;
  }
  const minDiscount = positive(subscription.min_discount);
  if (minDiscount != null && discountPercent(offer) < minDiscount) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    const { data: authorized, error: authError } = await admin.rpc("verify_alert_cron_token", { p_token: token });
    if (authError || authorized !== true) return new Response("Unauthorized", { status: 401 });

    const feedResponse = await fetch(FEED_URL, { headers: { "Cache-Control": "no-cache" } });
    if (!feedResponse.ok) throw new Error("Offer feed unavailable: " + feedResponse.status);
    const feed = await feedResponse.json();
    const offers = Array.isArray(feed?.offers) ? feed.offers : [];
    const bySlug = new Map(offers.filter((row: any) => row?.slug).map((row: any) => [String(row.slug), row]));

    const [{ data: subscriptions, error: subscriptionsError }, { data: savedOffers, error: savedError }] = await Promise.all([
      admin.from("alert_subscriptions")
        .select("id,user_id,alert_type,query,category,brand,merchant,max_price,min_discount,enabled")
        .eq("enabled", true),
      admin.from("saved_offers")
        .select("id,user_id,offer_slug,target_price,current_price_snapshot,is_available_snapshot,alert_on_target,alert_on_price_drop,alert_on_restock")
    ]);
    if (subscriptionsError) throw subscriptionsError;
    if (savedError) throw savedError;

    const notifications: any[] = [];
    const savedUpdates: any[] = [];

    for (const subscription of subscriptions || []) {
      const topMatches = offers
        .filter((offer: any) => matches(subscription, offer))
        .sort((a: any, b: any) => offerRank(b) - offerRank(a))
        .slice(0, MAX_MATCHES_PER_RULE);

      for (const offer of topMatches) {
        notifications.push({
          user_id: subscription.user_id,
          event_type: "new-match",
          title: "Neues Angebot zu deinem Alarm",
          body: String(offer.title || "Passendes Angebot").slice(0, 1000),
          offer_slug: offer.slug || null,
          offer_id: offer.id || null,
          dedupe_key: [subscription.user_id, "subscription", subscription.id, String(offer.id || offer.slug)].join(":")
        });
      }
    }

    for (const saved of savedOffers || []) {
      const offer = bySlug.get(String(saved.offer_slug));
      if (!offer) {
        if (saved.is_available_snapshot !== false) {
          savedUpdates.push({
            id: saved.id,
            user_id: saved.user_id,
            offer_slug: saved.offer_slug,
            is_available_snapshot: false
          });
        }
        continue;
      }

      const currentPrice = positive((offer as any).currentPrice);
      const previousPrice = positive(saved.current_price_snapshot);
      const targetPrice = positive(saved.target_price);
      const offerKey = String((offer as any).id || (offer as any).slug);
      const version = String((offer as any).updatedAt || (offer as any).currentPrice || "current");

      if (saved.alert_on_target && targetPrice != null && currentPrice != null && currentPrice <= targetPrice && (previousPrice == null || previousPrice > targetPrice)) {
        notifications.push({
          user_id: saved.user_id,
          event_type: "target-price",
          title: "Wunschpreis erreicht",
          body: (String((offer as any).title || saved.offer_slug) + " liegt jetzt bei " + currentPrice.toFixed(2) + " EUR.").slice(0,1000),
          offer_slug: saved.offer_slug,
          offer_id: (offer as any).id || null,
          dedupe_key: [saved.user_id, "saved", offerKey, "target", targetPrice, version].join(":")
        });
      }

      if (saved.alert_on_price_drop && previousPrice != null && currentPrice != null && currentPrice < previousPrice) {
        notifications.push({
          user_id: saved.user_id,
          event_type: "price-drop",
          title: "Preis gefallen",
          body: (String((offer as any).title || saved.offer_slug) + " ist von " + previousPrice.toFixed(2) + " EUR auf " + currentPrice.toFixed(2) + " EUR gefallen.").slice(0,1000),
          offer_slug: saved.offer_slug,
          offer_id: (offer as any).id || null,
          dedupe_key: [saved.user_id, "saved", offerKey, "drop", currentPrice, version].join(":")
        });
      }

      if (saved.alert_on_restock && saved.is_available_snapshot === false) {
        notifications.push({
          user_id: saved.user_id,
          event_type: "restock",
          title: "Wieder verfügbar",
          body: (String((offer as any).title || saved.offer_slug) + " ist wieder im Angebotslotse verfügbar.").slice(0,1000),
          offer_slug: saved.offer_slug,
          offer_id: (offer as any).id || null,
          dedupe_key: [saved.user_id, "saved", offerKey, "restock", version].join(":")
        });
      }

      savedUpdates.push({
        id: saved.id,
        user_id: saved.user_id,
        offer_slug: saved.offer_slug,
        current_price_snapshot: currentPrice ?? saved.current_price_snapshot ?? null,
        is_available_snapshot: true
      });
    }

    if (notifications.length) {
      const { error } = await admin
        .from("user_notifications")
        .upsert(notifications, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (error) throw error;
    }

    if (savedUpdates.length) {
      const { error } = await admin
        .from("saved_offers")
        .upsert(savedUpdates, { onConflict: "id", ignoreDuplicates: false });
      if (error) throw error;
    }

    return Response.json({
      ok: true,
      offers: offers.length,
      subscriptions: subscriptions?.length || 0,
      savedOffers: savedOffers?.length || 0,
      notificationCandidates: notifications.length,
      maxMatchesPerRule: MAX_MATCHES_PER_RULE,
      evaluatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
});