import { createClient } from "@supabase/supabase-js";

const config = globalThis.ANGEBOTSLOTSE_AUTH_CONFIG || {};
const root = document.querySelector("[data-account-root]");
if (!root || !config.url || !config.publishableKey) {
  root?.setAttribute("data-state", "unavailable");
} else {
  const supabase = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const WATCHLIST_KEY = "angebotslotse-watchlist-v1";
  const statusNode = root.querySelector("[data-account-status]");
  const signedOut = root.querySelector("[data-account-signed-out]");
  const signedIn = root.querySelector("[data-account-signed-in]");
  const emailForm = root.querySelector("[data-email-login]");
  const emailInput = root.querySelector("[data-email-input]");
  const googleButton = root.querySelector("[data-google-login]");
  const logoutButton = root.querySelector("[data-logout]");
  const syncButton = root.querySelector("[data-sync-watchlist]");
  const syncStatus = root.querySelector("[data-sync-status]");
  const userEmail = root.querySelector("[data-user-email]");
  const cloudCount = root.querySelector("[data-cloud-count]");

  const setStatus = (text, kind = "") => {
    if (!statusNode) return;
    statusNode.textContent = text || "";
    statusNode.dataset.kind = kind;
  };

  const readLocalWatchlist = () => {
    try {
      const value = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  };
  const writeLocalWatchlist = (items) => {
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items)); } catch {}
  };
  const accountBase = location.pathname.includes("/angebotslotse/") ? "/angebotslotse" : "";

  const cloudRowsToLocal = (rows) => Object.fromEntries((rows || []).map(row => [row.offer_slug, {
    id: row.offer_slug,
    title: row.title_snapshot || row.offer_slug,
    merchant: row.merchant_snapshot || "",
    savedPrice: row.current_price_snapshot == null ? null : Number(row.current_price_snapshot),
    currency: row.currency || "EUR",
    url: location.origin + accountBase + "/angebote/" + row.offer_slug + ".html",
    targetPrice: row.target_price == null ? null : Number(row.target_price),
    savedAt: row.created_at || new Date().toISOString()
  }]));

  async function loadCloudWatchlist(userId) {
    const { data, error } = await supabase
      .from("saved_offers")
      .select("offer_slug,title_snapshot,merchant_snapshot,current_price_snapshot,currency,target_price,created_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    if (cloudCount) cloudCount.textContent = String(data?.length || 0);
    return data || [];
  }

  async function syncLocalToCloud(userId) {
    const local = readLocalWatchlist();
    const rows = Object.values(local).filter(item => item?.id).map(item => ({
      user_id: userId,
      offer_slug: String(item.id),
      title_snapshot: item.title ? String(item.title).slice(0, 500) : null,
      merchant_snapshot: item.merchant ? String(item.merchant).slice(0, 180) : null,
      current_price_snapshot: Number(item.savedPrice) > 0 ? Number(item.savedPrice) : null,
      currency: /^[A-Z]{3}$/.test(String(item.currency || "")) ? item.currency : "EUR",
      target_price: Number(item.targetPrice) > 0 ? Number(item.targetPrice) : null,
      alert_on_target: true
    }));
    if (rows.length) {
      const { error } = await supabase.from("saved_offers").upsert(rows, { onConflict: "user_id,offer_slug" });
      if (error) throw error;
    }
    const cloudRows = await loadCloudWatchlist(userId);
    writeLocalWatchlist({ ...readLocalWatchlist(), ...cloudRowsToLocal(cloudRows) });
    return cloudRows.length;
  }

  async function renderSession(session) {
    const user = session?.user || null;
    signedOut.hidden = Boolean(user);
    signedIn.hidden = !user;
    if (!user) {
      if (userEmail) userEmail.textContent = "";
      if (cloudCount) cloudCount.textContent = "0";
      return;
    }
    if (userEmail) userEmail.textContent = user.email || "Angemeldet";
    try {
      const rows = await loadCloudWatchlist(user.id);
      writeLocalWatchlist({ ...readLocalWatchlist(), ...cloudRowsToLocal(rows) });
    } catch (error) {
      setStatus("Cloud-Merkliste konnte nicht geladen werden.", "error");
      console.error(error);
    }
  }

  emailForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const email = String(emailInput?.value || "").trim();
    if (!email) return;
    setStatus("Anmeldelink wird angefordert …");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.href.split("#")[0].split("?")[0] }
    });
    if (error) setStatus(error.message || "Anmeldung konnte nicht gestartet werden.", "error");
    else setStatus("Prüfe dein E-Mail-Postfach. Der Login-Link wurde angefordert.", "success");
  });

  googleButton?.addEventListener("click", async () => {
    if (!config.googleAuthEnabled) {
      setStatus("Google-Login ist vorbereitet, aber der Google-OAuth-Client ist noch nicht freigeschaltet.", "info");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.href.split("#")[0].split("?")[0] }
    });
    if (error) setStatus(error.message || "Google-Login konnte nicht gestartet werden.", "error");
  });

  logoutButton?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    setStatus("Du bist abgemeldet.", "success");
  });

  syncButton?.addEventListener("click", async () => {
    syncButton.disabled = true;
    if (syncStatus) syncStatus.textContent = "Synchronisierung läuft …";
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error("Bitte zuerst anmelden.");
      const count = await syncLocalToCloud(user.id);
      if (syncStatus) syncStatus.textContent = String(count) + " Cloud-Einträge synchronisiert.";
    } catch (error) {
      if (syncStatus) syncStatus.textContent = error.message || "Synchronisierung fehlgeschlagen.";
    } finally {
      syncButton.disabled = false;
    }
  });

  (async () => {
    const { data } = await supabase.auth.getSession();
    await renderSession(data.session);
    supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => renderSession(session));
    });
  })().catch(error => {
    setStatus("Konto konnte nicht initialisiert werden.", "error");
    console.error(error);
  });
}
