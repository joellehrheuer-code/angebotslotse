import { createClient } from "@supabase/supabase-js";
import { matchAlertSubscription } from "../scripts/lib/alert-matcher.mjs";
import { fetchJsonWithTimeout } from "./lib/fetch-json.mjs";

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
  const accountHeroTitle = root.querySelector("[data-account-hero-title]");
  const accountHeroIntro = root.querySelector("[data-account-hero-intro]");

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
  const alertsCard = root.querySelector("[data-account-alerts-card]");
  const alertForm = root.querySelector("[data-alert-form]");
  const alertType = root.querySelector("[data-alert-type]");
  const alertQuery = root.querySelector("[data-alert-query]");
  const alertMaxPrice = root.querySelector("[data-alert-max-price]");
  const alertMinDiscount = root.querySelector("[data-alert-min-discount]");
  const alertStatus = root.querySelector("[data-alert-status]");
  const alertList = root.querySelector("[data-alert-list]");
  const matchesCard = root.querySelector("[data-account-matches-card]");
  const matchesNode = root.querySelector("[data-alert-matches]");
  const notificationsCard = root.querySelector("[data-account-notifications-card]");
  const notificationList = root.querySelector("[data-notification-list]");
  const notificationStatus = root.querySelector("[data-notification-status]");
  const notificationsReadAll = root.querySelector("[data-notifications-read-all]");
  const accountDataActions = root.querySelector("[data-account-data-actions]");
  const accountDataStatus = root.querySelector("[data-account-data-status]");
  const exportAccountButton = root.querySelector("[data-export-account]");
  const deleteAccountButton = root.querySelector("[data-delete-account]");
  const pushCard = root.querySelector("[data-account-push-card]");
  const pushEnableButton = root.querySelector("[data-push-enable]");
  const pushDisableButton = root.querySelector("[data-push-disable]");
  const pushPreferences = root.querySelector("[data-push-preferences]");
  const pushPrice = root.querySelector("[data-push-price]");
  const pushMatches = root.querySelector("[data-push-matches]");
  const pushStatus = root.querySelector("[data-push-status]");
  const cashbackCard = root.querySelector("[data-account-cashback-card]");
  const cashbackConfirmed = root.querySelector("[data-cashback-confirmed]");
  const cashbackPending = root.querySelector("[data-cashback-pending]");
  const cashbackStatus = root.querySelector("[data-cashback-status]");
  const cashbackList = root.querySelector("[data-cashback-list]");

  let notificationChannel = null;

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

  const alertLabel = row => {
    const type = row.alert_type || "";
    const value = row.query || row.category || row.brand || row.merchant || "";
    const names = { search: "Suche", category: "Kategorie", brand: "Marke", merchant: "Händler" };
    return (names[type] || "Alarm") + ": " + value;
  };

  function renderAlerts(rows, userId) {
    if (!alertList) return;
    alertList.replaceChildren();
    if (!rows?.length) {
      const empty = document.createElement("p");
      empty.className = "account-alert-empty";
      empty.textContent = "Noch keine persönlichen Alarme gespeichert.";
      alertList.append(empty);
      return;
    }
    for (const row of rows) {
      const item = document.createElement("article");
      item.className = "account-alert-item";

      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = alertLabel(row);
      const meta = document.createElement("small");
      const parts = [];
      if (Number(row.max_price) > 0) parts.push("bis " + Number(row.max_price).toLocaleString("de-DE",{style:"currency",currency:"EUR"}));
      if (Number(row.min_discount) > 0) parts.push("ab " + Number(row.min_discount) + " % Rabatt");
      meta.textContent = parts.join(" · ") || "Neue passende Angebote";
      copy.append(title, meta);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button small";
      remove.textContent = "Löschen";
      remove.dataset.alertDelete = row.id;
      remove.dataset.userId = userId;
      item.append(copy, remove);
      alertList.append(item);
    }
  }

  const money = (value, currency = "EUR") => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0
      ? number.toLocaleString("de-DE", { style: "currency", currency })
      : "Preis beim Anbieter prüfen";
  };

  const offerDiscount = offer => {
    const current = Number(offer.currentPrice);
    const previous = Number(offer.previousPrice);
    return Number.isFinite(current) && current > 0 && Number.isFinite(previous) && previous > current
      ? Math.round((1 - current / previous) * 100)
      : 0;
  };

  function renderAlertMatches(subscriptions, offers) {
    if (!matchesNode) return;
    matchesNode.replaceChildren();
    if (!subscriptions?.length) {
      const empty = document.createElement("p");
      empty.className = "account-alert-empty";
      empty.textContent = "Lege zuerst einen Alarm an, um passende Angebote zu sehen.";
      matchesNode.append(empty);
      return;
    }

    const matches = (offers || []).map(offer => ({
      offer,
      ruleCount: subscriptions.filter(rule => matchAlertSubscription(rule, offer)).length
    })).filter(row => row.ruleCount > 0)
      .sort((a, b) => offerDiscount(b.offer) - offerDiscount(a.offer) || String(b.offer.updatedAt || "").localeCompare(String(a.offer.updatedAt || "")))
      .slice(0, 12);

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "account-alert-empty";
      empty.textContent = "Aktuell gibt es keine Angebote, die deine Alarmregeln erfüllen.";
      matchesNode.append(empty);
      return;
    }

    for (const { offer, ruleCount } of matches) {
      const link = document.createElement("a");
      link.className = "account-match-item";
      link.href = location.origin + accountBase + "/angebote/" + encodeURIComponent(offer.slug) + ".html";

      if (offer.imageUrl) {
        const image = document.createElement("img");
        image.src = offer.imageUrl;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        link.append(image);
      }

      const body = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = offer.title || "Angebot";
      const meta = document.createElement("small");
      const discount = offerDiscount(offer);
      meta.textContent = [offer.advertiser || "", money(offer.currentPrice, offer.currency || "EUR"), discount ? "-" + discount + " %" : "", ruleCount > 1 ? ruleCount + " Alarmregeln" : ""].filter(Boolean).join(" · ");
      body.append(title, meta);
      link.append(body);
      matchesNode.append(link);
    }
  }

  async function loadAlertMatches(subscriptions) {
    try {
      const payload = await fetchJsonWithTimeout(location.origin + accountBase + "/alerts-feed.json", { cache: "no-store" });
      renderAlertMatches(subscriptions, Array.isArray(payload?.offers) ? payload.offers : []);
    } catch (error) {
      if (!matchesNode) return;
      matchesNode.replaceChildren();
      const message = document.createElement("p");
      message.className = "account-alert-empty";
      message.textContent = error.message || "Aktuelle Alarmtreffer konnten gerade nicht geladen werden.";
      matchesNode.append(message);
      console.error(error);
    }
  }

  async function loadAlerts(userId) {
    const { data, error } = await supabase
      .from("alert_subscriptions")
      .select("id,alert_type,query,category,brand,merchant,max_price,min_discount,enabled,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data || [];
    renderAlerts(rows, userId);
    await loadAlertMatches(rows);
    return rows;
  }

  function renderNotifications(rows) {
    if (!notificationList) return;
    notificationList.replaceChildren();
    if (!rows?.length) {
      const empty = document.createElement("p");
      empty.className = "account-alert-empty";
      empty.textContent = "Noch keine persönlichen Meldungen.";
      notificationList.append(empty);
      return;
    }
    for (const row of rows) {
      const item = document.createElement("article");
      item.className = "account-notification-item" + (row.is_read ? "" : " unread");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = row.title;
      const body = document.createElement("p");
      body.textContent = row.body || "";
      const meta = document.createElement("small");
      meta.textContent = new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(row.created_at));
      copy.append(title, body, meta);
      if (row.offer_slug) {
        const link = document.createElement("a");
        link.href = location.origin + accountBase + "/angebote/" + encodeURIComponent(row.offer_slug) + ".html";
        link.textContent = "Angebot ansehen →";
        copy.append(link);
      }
      const actions = document.createElement("div");
      if (!row.is_read) {
        const read = document.createElement("button");
        read.className = "button small";
        read.type = "button";
        read.textContent = "Gelesen";
        read.dataset.notificationRead = row.id;
        actions.append(read);
      }
      const remove = document.createElement("button");
      remove.className = "button small";
      remove.type = "button";
      remove.textContent = "Löschen";
      remove.dataset.notificationDelete = row.id;
      actions.append(remove);
      item.append(copy, actions);
      notificationList.append(item);
    }
  }

  async function loadNotifications(userId) {
    const { data, error } = await supabase
      .from("user_notifications")
      .select("id,event_type,title,body,offer_slug,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    renderNotifications(data || []);
    return data || [];
  }

  const cashbackMoney = (value, currency = "EUR") => {
    const number = Number(value || 0);
    return Number.isFinite(number)
      ? number.toLocaleString("de-DE", { style: "currency", currency })
      : "0,00 €";
  };

  function renderCashbackClaims(rows) {
    if (!cashbackList) return;
    cashbackList.replaceChildren();
    const confirmedTotal = (rows || [])
      .filter(row => row.claim_status === "confirmed" || row.claim_status === "paid")
      .reduce((sum,row)=>sum+Number(row.cashback_amount || 0),0);
    const pendingTotal = (rows || [])
      .filter(row => row.claim_status === "pending")
      .reduce((sum,row)=>sum+Number(row.cashback_amount || 0),0);
    if (cashbackConfirmed) cashbackConfirmed.textContent = cashbackMoney(confirmedTotal);
    if (cashbackPending) cashbackPending.textContent = cashbackMoney(pendingTotal);

    if (!rows?.length) {
      const empty=document.createElement("p");
      empty.className="account-alert-empty";
      empty.textContent="Noch keine Cashback-Ansprüche vorhanden.";
      cashbackList.append(empty);
      return;
    }
    const labels={pending:"In Prüfung",confirmed:"Bestätigt",paid:"Ausgezahlt",rejected:"Abgelehnt",expired:"Verfallen"};
    for (const row of rows) {
      const item=document.createElement("article");
      item.className="account-cashback-item";
      const title=document.createElement("strong");
      title.textContent=row.cashback_programs?.display_name || row.merchant_key || "Partner";
      const meta=document.createElement("small");
      const when=row.transaction_at || row.created_at;
      meta.textContent=[labels[row.claim_status] || row.claim_status,cashbackMoney(row.cashback_amount,row.currency || "EUR"),when ? new Intl.DateTimeFormat("de-DE",{dateStyle:"medium"}).format(new Date(when)) : ""].filter(Boolean).join(" · ");
      item.append(title,meta);
      cashbackList.append(item);
    }
  }

  async function loadCashbackClaims(userId) {
    if (!cashbackCard) return [];
    const { data, error } = await supabase
      .from("cashback_claims")
      .select("id,merchant_key,claim_status,cashback_amount,currency,transaction_at,confirmed_at,paid_at,created_at,cashback_programs(display_name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    renderCashbackClaims(data || []);
    if (cashbackStatus) cashbackStatus.textContent = "";
    return data || [];
  }

  async function subscribeNotifications(userId) {
    if (notificationChannel) await supabase.removeChannel(notificationChannel);
    notificationChannel = supabase.channel("user-notifications-" + userId)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "user_notifications",
        filter: "user_id=eq." + userId
      }, () => loadNotifications(userId).catch(console.error))
      .subscribe();
  }

  const vapidToBytes = value => {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  };

  const pushSupported = () => Boolean(
    config.webPushVapidPublicKey &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );

  async function loadPushState(userId) {
    if (!pushCard) return null;
    if (!pushSupported()) {
      if (pushEnableButton) pushEnableButton.disabled = true;
      if (pushDisableButton) pushDisableButton.hidden = true;
      if (pushPreferences) pushPreferences.hidden = true;
      if (pushStatus) pushStatus.textContent = "Dieser Browser unterstützt Web-Push hier nicht.";
      return null;
    }

    const { data: prefs, error: prefError } = await supabase
      .from("notification_preferences")
      .select("push_price_alerts,push_new_matches")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefError) throw prefError;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (pushPrice) pushPrice.checked = Boolean(prefs?.push_price_alerts);
    if (pushMatches) pushMatches.checked = Boolean(prefs?.push_new_matches);
    if (pushEnableButton) {
      pushEnableButton.hidden = Boolean(subscription);
      pushEnableButton.disabled = Notification.permission === "denied";
    }
    if (pushDisableButton) pushDisableButton.hidden = !subscription;
    if (pushPreferences) pushPreferences.hidden = !subscription;
    if (pushStatus) {
      pushStatus.textContent = Notification.permission === "denied"
        ? "Push ist im Browser blockiert. Du kannst die Berechtigung in den Website-Einstellungen wieder erlauben."
        : subscription
          ? "Push ist auf diesem Gerät aktiv."
          : "Push ist auf diesem Gerät noch nicht aktiviert.";
    }
    return subscription;
  }

  async function savePushPreferences(userId) {
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: userId,
      push_price_alerts: Boolean(pushPrice?.checked),
      push_new_matches: Boolean(pushMatches?.checked)
    }, { onConflict: "user_id" });
    if (error) throw error;
    if (pushStatus) pushStatus.textContent = "Push-Einstellungen gespeichert.";
  }

  async function renderSession(session) {
    const user = session?.user || null;
    signedOut.hidden = Boolean(user);
    signedIn.hidden = !user;
    if (alertsCard) alertsCard.hidden = !user;
    if (matchesCard) matchesCard.hidden = !user;
    if (notificationsCard) notificationsCard.hidden = !user;
    if (pushCard) pushCard.hidden = !user;
    if (cashbackCard) cashbackCard.hidden = !user;
    if (accountDataActions) accountDataActions.hidden = !user;
    if (!user) {
      if (accountHeroTitle) accountHeroTitle.textContent = "Willkommen bei Angebotslotse.";
      if (accountHeroIntro) accountHeroIntro.textContent = "Erstelle ein kostenloses Konto oder melde dich an, um Merkliste, Wunschpreise, Alarme und Meldungen geräteübergreifend zu nutzen. Ohne Konto bleibt deine lokale Merkliste weiterhin erhalten.";
      if (userEmail) userEmail.textContent = "";
      if (cloudCount) cloudCount.textContent = "0";
      if (alertList) alertList.replaceChildren();
      if (matchesNode) matchesNode.replaceChildren();
      if (notificationList) notificationList.replaceChildren();
      if (cashbackList) cashbackList.replaceChildren();
      if (cashbackConfirmed) cashbackConfirmed.textContent = "0,00 €";
      if (cashbackPending) cashbackPending.textContent = "0,00 €";
      if (pushPreferences) pushPreferences.hidden = true;
      if (pushDisableButton) pushDisableButton.hidden = true;
      if (pushEnableButton) pushEnableButton.hidden = false;
      if (pushStatus) pushStatus.textContent = "";
      if (notificationChannel) {
        await supabase.removeChannel(notificationChannel);
        notificationChannel = null;
      }
      return;
    }
    if (accountHeroTitle) accountHeroTitle.textContent = "Willkommen zurück.";
    if (accountHeroIntro) accountHeroIntro.textContent = "Deine gespeicherten Angebote, Wunschpreise, Alarme und Meldungen werden jetzt mit deinem Konto geladen.";
    if (userEmail) userEmail.textContent = user.email || "Angemeldet";

    const accountLoaders = [
      ["Merkliste", loadCloudWatchlist(user.id)],
      ["Alarme", loadAlerts(user.id)],
      ["Meldungen", loadNotifications(user.id)],
      ["Push", loadPushState(user.id)],
      ["Cashback", loadCashbackClaims(user.id)]
    ];
    const results = await Promise.allSettled(accountLoaders.map(([, task]) => task));

    const watchlistResult = results[0];
    if (watchlistResult?.status === "fulfilled") {
      writeLocalWatchlist({
        ...readLocalWatchlist(),
        ...cloudRowsToLocal(watchlistResult.value)
      });
    }

    let failedAreas = 0;
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        failedAreas += 1;
        console.error("Konto-Bereich konnte nicht geladen werden:", accountLoaders[index][0], result.reason);
      }
    });

    try {
      await subscribeNotifications(user.id);
    } catch (error) {
      failedAreas += 1;
      console.error("Live-Meldungen konnten nicht abonniert werden.", error);
    }

    if (failedAreas > 0) {
      setStatus(
        failedAreas === 1
          ? "Ein Cloud-Bereich konnte gerade nicht geladen werden. Die übrigen Funktionen bleiben verfügbar."
          : failedAreas + " Cloud-Bereiche konnten gerade nicht geladen werden. Die übrigen Funktionen bleiben verfügbar.",
        "error"
      );
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

  alertForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (alertStatus) alertStatus.textContent = "Alarm wird gespeichert …";
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error("Bitte zuerst anmelden.");

      const type = String(alertType?.value || "search");
      const query = String(alertQuery?.value || "").trim();
      if (!query) throw new Error("Bitte einen Begriff eingeben.");
      const maxPrice = Number(alertMaxPrice?.value);
      const minDiscount = Number(alertMinDiscount?.value);
      const row = {
        user_id: user.id,
        alert_type: type,
        query: type === "search" ? query : null,
        category: type === "category" ? query : null,
        brand: type === "brand" ? query : null,
        merchant: type === "merchant" ? query : null,
        max_price: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : null,
        min_discount: Number.isFinite(minDiscount) && minDiscount > 0 ? Math.min(100, Math.round(minDiscount)) : null,
        enabled: true
      };
      const { error } = await supabase.from("alert_subscriptions").insert(row);
      if (error) throw error;
      alertForm.reset();
      await loadAlerts(user.id);
      if (alertStatus) alertStatus.textContent = "Alarm gespeichert.";
    } catch (error) {
      if (alertStatus) alertStatus.textContent = error.message || "Alarm konnte nicht gespeichert werden.";
    }
  });

  alertList?.addEventListener("click", async event => {
    const button = event.target.closest("[data-alert-delete]");
    if (!button) return;
    button.disabled = true;
    if (alertStatus) alertStatus.textContent = "Alarm wird gelöscht …";
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error("Bitte zuerst anmelden.");
      const { error } = await supabase
        .from("alert_subscriptions")
        .delete()
        .eq("id", button.dataset.alertDelete)
        .eq("user_id", user.id);
      if (error) throw error;
      await loadAlerts(user.id);
      if (alertStatus) alertStatus.textContent = "Alarm gelöscht.";
    } catch (error) {
      if (alertStatus) alertStatus.textContent = error.message || "Alarm konnte nicht gelöscht werden.";
      button.disabled = false;
    }
  });

  notificationList?.addEventListener("click", async event => {
    const read = event.target.closest("[data-notification-read]");
    const remove = event.target.closest("[data-notification-delete]");
    if (!read && !remove) return;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    const id = read?.dataset.notificationRead || remove?.dataset.notificationDelete;
    const query = supabase.from("user_notifications");
    const result = read
      ? await query.update({ is_read: true }).eq("id", id).eq("user_id", user.id)
      : await query.delete().eq("id", id).eq("user_id", user.id);
    if (result.error) {
      if (notificationStatus) notificationStatus.textContent = result.error.message;
      return;
    }
    await loadNotifications(user.id);
  });

  notificationsReadAll?.addEventListener("click", async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    const { error } = await supabase.from("user_notifications")
      .update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    if (notificationStatus) notificationStatus.textContent = error ? error.message : "Alle Meldungen als gelesen markiert.";
    if (!error) await loadNotifications(user.id);
  });

  pushEnableButton?.addEventListener("click", async () => {
    if (!pushSupported()) {
      if (pushStatus) pushStatus.textContent = "Web-Push wird von diesem Browser nicht unterstützt.";
      return;
    }
    pushEnableButton.disabled = true;
    if (pushStatus) pushStatus.textContent = "Browser-Berechtigung wird angefragt …";
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error("Bitte zuerst anmelden.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Push-Benachrichtigungen wurden nicht erlaubt.");

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidToBytes(config.webPushVapidPublicKey)
        });
      }

      const { error } = await supabase.functions.invoke("push-subscription", {
        body: { action: "subscribe", subscription: subscription.toJSON() }
      });
      if (error) throw error;

      if (pushPrice) pushPrice.checked = true;
      if (pushMatches) pushMatches.checked = true;
      await savePushPreferences(user.id);
      await loadPushState(user.id);
      if (pushStatus) pushStatus.textContent = "Push ist auf diesem Gerät aktiviert.";
    } catch (error) {
      if (pushStatus) pushStatus.textContent = error.message || "Push konnte nicht aktiviert werden.";
    } finally {
      pushEnableButton.disabled = Notification.permission === "denied";
    }
  });

  pushDisableButton?.addEventListener("click", async () => {
    pushDisableButton.disabled = true;
    if (pushStatus) pushStatus.textContent = "Push wird auf diesem Gerät deaktiviert …";
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error("Bitte zuerst anmelden.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const { error } = await supabase.functions.invoke("push-subscription", {
          body: { action: "unsubscribe", subscription: subscription.toJSON() }
        });
        if (error) throw error;
        await subscription.unsubscribe();
      }
      await loadPushState(user.id);
      if (pushStatus) pushStatus.textContent = "Push ist auf diesem Gerät deaktiviert.";
    } catch (error) {
      if (pushStatus) pushStatus.textContent = error.message || "Push konnte nicht deaktiviert werden.";
    } finally {
      pushDisableButton.disabled = false;
    }
  });

  for (const checkbox of [pushPrice, pushMatches]) {
    checkbox?.addEventListener("change", async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) throw new Error("Bitte zuerst anmelden.");
        await savePushPreferences(user.id);
      } catch (error) {
        if (pushStatus) pushStatus.textContent = error.message || "Push-Einstellungen konnten nicht gespeichert werden.";
      }
    });
  }

  exportAccountButton?.addEventListener("click", async () => {
    exportAccountButton.disabled = true;
    if (accountDataStatus) accountDataStatus.textContent = "Datenexport wird erstellt …";
    try {
      const { data, error } = await supabase.functions.invoke("export-account", { body: {} });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "angebotslotse-meine-daten.json";
      a.click();
      URL.revokeObjectURL(href);
      if (accountDataStatus) accountDataStatus.textContent = "Datenexport erstellt.";
    } catch (error) {
      if (accountDataStatus) accountDataStatus.textContent = error.message || "Datenexport fehlgeschlagen.";
    } finally {
      exportAccountButton.disabled = false;
    }
  });

  deleteAccountButton?.addEventListener("click", async () => {
    if (!confirm("Konto wirklich vollständig löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.")) return;
    const phrase = prompt('Zur Bestätigung exakt "KONTO LÖSCHEN" eingeben:');
    if (phrase !== "KONTO LÖSCHEN") {
      if (accountDataStatus) accountDataStatus.textContent = "Löschung abgebrochen.";
      return;
    }
    deleteAccountButton.disabled = true;
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: { confirmation: phrase } });
      if (error) throw error;
      localStorage.removeItem(WATCHLIST_KEY);
      await supabase.auth.signOut();
      if (accountDataStatus) accountDataStatus.textContent = "Konto wurde gelöscht.";
    } catch (error) {
      if (accountDataStatus) accountDataStatus.textContent = error.message || "Konto konnte nicht gelöscht werden.";
      deleteAccountButton.disabled = false;
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
