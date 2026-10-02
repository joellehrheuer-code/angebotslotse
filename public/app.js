const input = document.querySelector("#search");
const cards = [...document.querySelectorAll("[data-search]")];
const noResults = document.querySelector("#no-results");
const params = new URLSearchParams(location.search); const category = params.get("kategorie"); const globalQuery = params.get("suche");
const normalizeSearch = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9äöüß]+/g," ").trim();
const oneEditAway = (word,query) => {
  if (word === query) return true;
  if (Math.abs(word.length-query.length) > 1) return false;
  let i=0,j=0,diffs=0;
  while(i<word.length && j<query.length){
    if(word[i]===query[j]){i++;j++;continue;}
    if(++diffs>1)return false;
    if(word.length>query.length)i++;
    else if(query.length>word.length)j++;
    else {i++;j++;}
  }
  return diffs + (i<word.length || j<query.length ? 1 : 0) <= 1;
};
function searchMatches(haystack,query){
  const normalizedQuery=normalizeSearch(query);
  if(!normalizedQuery)return true;
  const normalizedHaystack=normalizeSearch(haystack);
  if(normalizedHaystack.includes(normalizedQuery))return true;
  const words=normalizedHaystack.split(/\s+/).filter(Boolean);
  return normalizedQuery.split(/\s+/).filter(Boolean).every(token =>
    normalizedHaystack.includes(token) ||
    (token.length>=4 && words.some(word => word.startsWith(token) || token.startsWith(word) || oneEditAway(word,token)))
  );
}
if (globalQuery && input) input.value = globalQuery;
function filter() { const q = (input?.value || "").trim(); let visible=0; for (const card of cards) { const ok=searchMatches(card.dataset.search,q) && (!category || card.dataset.search.includes(category)); card.hidden=!ok; if(ok) visible++; } if(noResults) noResults.hidden=visible>0; }
input?.addEventListener("input",filter); filter();


const appInstallButton = document.querySelector("[data-app-install]");
const appInstallHelp = document.querySelector("[data-app-install-help]");
let deferredInstallPrompt = null;
const appStandalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !appStandalone;
const showInstallHelp = message => {
  if (!appInstallHelp) return;
  appInstallHelp.textContent = message;
  appInstallHelp.hidden = false;
};
if (appInstallButton && !appStandalone) {
  if (isiOS) appInstallButton.hidden = false;
  addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    appInstallButton.hidden = false;
  });
  appInstallButton.addEventListener("click", async () => {
    if (isiOS) {
      showInstallHelp("Auf iPhone/iPad: Teilen öffnen und „Zum Home-Bildschirm“ wählen.");
      return;
    }
    if (!deferredInstallPrompt) {
      showInstallHelp("Die Installation ist in diesem Browser gerade nicht verfügbar. Nutze das Browser-Menü und wähle „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.");
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") appInstallButton.hidden = true;
    deferredInstallPrompt = null;
  });
  addEventListener("appinstalled", () => {
    appInstallButton.hidden = true;
    if (appInstallHelp) appInstallHelp.hidden = true;
    deferredInstallPrompt = null;
  });
}

const categorySearch = document.querySelector("[data-offer-search]");
const categorySort = document.querySelector("[data-offer-sort]");
const brandFilter = document.querySelector("[data-filter-brand]");
const merchantFilter = document.querySelector("[data-filter-merchant]");
const maxPriceFilter = document.querySelector("[data-filter-max-price]");
const discountFilter = document.querySelector("[data-filter-discount]");
const resetFilters = document.querySelector("[data-filter-reset]");
const filterCount = document.querySelector("[data-filter-count]");
const sortGrid = document.querySelector("[data-sort-grid]");
const filterEmpty = document.querySelector("[data-no-filter-results]");
const activeFilters = document.querySelector("[data-active-filters]");
const activeFilterChips = document.querySelector("[data-active-filter-chips]");
const clearAllFilters = document.querySelector("[data-filter-clear-all]");
const forwardedSearch = params.get("suche");
if (forwardedSearch && categorySearch) categorySearch.value = forwardedSearch;
const filterOptionText = select => select?.selectedOptions?.[0]?.textContent?.trim() || "";
function clearListingFilter(key) {
  if (key === "search" && categorySearch) categorySearch.value = "";
  if (key === "brand" && brandFilter) brandFilter.value = "";
  if (key === "merchant" && merchantFilter) merchantFilter.value = "";
  if (key === "price" && maxPriceFilter) maxPriceFilter.value = "";
  if (key === "discount" && discountFilter) discountFilter.checked = false;
}
function syncActiveFilterChips() {
  if (!activeFilters || !activeFilterChips) return;
  const chips = [];
  const searchValue = categorySearch?.value?.trim();
  if (searchValue) chips.push(["search", "Suche: " + searchValue]);
  if (brandFilter?.value) chips.push(["brand", "Marke: " + filterOptionText(brandFilter)]);
  if (merchantFilter?.value) chips.push(["merchant", "Händler: " + filterOptionText(merchantFilter)]);
  const maxValue = Number(maxPriceFilter?.value);
  if (Number.isFinite(maxValue) && maxValue > 0) chips.push(["price", "Bis " + new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(maxValue)]);
  if (discountFilter?.checked) chips.push(["discount", "Nur Rabatt"]);
  activeFilterChips.replaceChildren(...chips.map(([key,label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "active-filter-chip";
    button.dataset.clearFilter = key;
    button.setAttribute("aria-label", label + " entfernen");
    const text = document.createElement("span");
    text.textContent = label;
    const close = document.createElement("b");
    close.setAttribute("aria-hidden","true");
    close.textContent = "×";
    button.append(text, close);
    return button;
  }));
  activeFilters.hidden = chips.length === 0;
}
function updateCategoryListing() {
  if (!sortGrid) return;
  const query = (categorySearch?.value || "").trim();
  const brand = (brandFilter?.value || "").trim().toLowerCase();
  const merchant = (merchantFilter?.value || "").trim().toLowerCase();
  const maxPriceValue = Number(maxPriceFilter?.value);
  const hasMaxPrice = Number.isFinite(maxPriceValue) && maxPriceValue > 0;
  const discountOnly = Boolean(discountFilter?.checked);
  const rows = [...sortGrid.querySelectorAll(".deal-card")];
  const mode = categorySort?.value || "current";
  rows.sort((a,b) => mode === "ending" ? (a.dataset.end || "9999").localeCompare(b.dataset.end || "9999") : mode === "discount" ? Number(b.dataset.discount)-Number(a.dataset.discount) : mode === "price" ? (Number(a.dataset.price || Infinity)-Number(b.dataset.price || Infinity)) : (b.dataset.updated || "").localeCompare(a.dataset.updated || ""));
  let visible = 0;
  for (const row of rows) {
    const price = Number(row.dataset.price);
    const matches = searchMatches(row.dataset.search,query)
      && (!brand || row.dataset.brand === brand)
      && (!merchant || row.dataset.merchant === merchant)
      && (!hasMaxPrice || (Number.isFinite(price) && price > 0 && price <= maxPriceValue))
      && (!discountOnly || Number(row.dataset.discount) > 0);
    row.hidden = !matches;
    if (matches) visible += 1;
    sortGrid.append(row);
  }
  if (filterCount) filterCount.textContent = String(visible) + " Treffer";
  if (filterEmpty) filterEmpty.hidden = visible > 0;
  syncActiveFilterChips();
}
for (const element of [categorySearch,maxPriceFilter]) element?.addEventListener("input", updateCategoryListing);
for (const element of [categorySort,brandFilter,merchantFilter,discountFilter]) element?.addEventListener("change", updateCategoryListing);
activeFilterChips?.addEventListener("click", event => {
  const button = event.target.closest("[data-clear-filter]");
  if (!button) return;
  clearListingFilter(button.dataset.clearFilter);
  updateCategoryListing();
});
clearAllFilters?.addEventListener("click", () => resetFilters?.click());
resetFilters?.addEventListener("click", () => {
  if (categorySearch) categorySearch.value = "";
  if (categorySort) categorySort.value = "current";
  if (brandFilter) brandFilter.value = "";
  if (merchantFilter) merchantFilter.value = "";
  if (maxPriceFilter) maxPriceFilter.value = "";
  if (discountFilter) discountFilter.checked = false;
  updateCategoryListing();
  categorySearch?.focus();
});
updateCategoryListing();

document.querySelectorAll("[data-slider]").forEach(slider => {
  const section = slider.closest(".deal-section");
  const step = () => Math.max(260, slider.clientWidth * .82);
  section?.querySelector("[data-slider-prev]")?.addEventListener("click", () => slider.scrollBy({left:-step(),behavior:"smooth"}));
  section?.querySelector("[data-slider-next]")?.addEventListener("click", () => slider.scrollBy({left:step(),behavior:"smooth"}));
  slider.addEventListener("keydown", event => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault(); slider.scrollBy({left:event.key === "ArrowRight" ? step() : -step(),behavior:"smooth"});
    }
  });
  let dragging=false,startX=0,startScroll=0;
  slider.addEventListener("pointerdown", event => { if (event.pointerType === "touch") return; dragging=true; startX=event.clientX; startScroll=slider.scrollLeft; slider.classList.add("dragging"); slider.setPointerCapture(event.pointerId); });
  slider.addEventListener("pointermove", event => { if (dragging) slider.scrollLeft=startScroll-(event.clientX-startX); });
  const stop = () => { dragging=false; slider.classList.remove("dragging"); };
  slider.addEventListener("pointerup",stop); slider.addEventListener("pointercancel",stop);
});

const heroSlides=[...document.querySelectorAll("[data-hero-slide]")];
const heroDots=[...document.querySelectorAll("[data-hero-dot]")];
let heroIndex=0;
function showHero(index){heroIndex=(index+heroSlides.length)%heroSlides.length;heroSlides.forEach((slide,i)=>{slide.classList.toggle("active",i===heroIndex);slide.setAttribute("aria-hidden",String(i!==heroIndex));});heroDots.forEach((dot,i)=>dot.setAttribute("aria-current",String(i===heroIndex)));}
heroDots.forEach((dot,i)=>dot.addEventListener("click",()=>showHero(i)));
if(heroSlides.length>1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) setInterval(()=>showHero(heroIndex+1),7000);

const observer="IntersectionObserver" in window ? new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target);}}),{rootMargin:"0px 0px -8%"}) : null;
document.querySelectorAll(".reveal").forEach(element=>observer?observer.observe(element):element.classList.add("in-view"));

const numberFormatter = new Intl.NumberFormat("de-DE");
const countElements = [...document.querySelectorAll("[data-count-up]")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const animateCount = element => {
  const target = Number(element.dataset.countUp || 0);
  if (!Number.isFinite(target) || target < 0) return;
  if (reducedMotion || target === 0) {
    element.textContent = numberFormatter.format(target);
    return;
  }
  const duration = Math.min(1100, 520 + target * 5);
  const start = performance.now();
  const step = now => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = numberFormatter.format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
if (countElements.length) {
  if (reducedMotion || !("IntersectionObserver" in window)) countElements.forEach(animateCount);
  else {
    const countObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    }), {rootMargin:"0px 0px -10%"});
    countElements.forEach(element => countObserver.observe(element));
  }
}
document.querySelectorAll("[data-media]").forEach(image=>{
  const wrap=image.closest(".has-media");
  const done=()=>wrap?.classList.add("loaded");
  const fallback=()=>{
    const src=image.dataset.fallbackSrc;
    if(src && image.src!==src){
      image.dataset.fallbackUsed="true";
      image.src=src;
      image.removeAttribute("referrerpolicy");
      wrap?.classList.add("media-fallback");
      return;
    }
    done();
  };
  if(image.complete){
    if(image.naturalWidth>0)done(); else fallback();
  }else{
    image.addEventListener("load",done,{once:true});
    image.addEventListener("error",fallback,{once:true});
  }
});

document.querySelectorAll("[data-history-range]").forEach(button=>button.addEventListener("click",()=>{
  const history=button.closest(".price-history"),range=button.dataset.historyRange;
  history?.querySelectorAll("[data-history-range]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
  history?.querySelectorAll("[data-history-panel]").forEach(panel=>panel.hidden=panel.dataset.historyPanel!==range);
}));

document.querySelectorAll(".header-links a, #main-nav a, .mobile-bottom-nav a, .footer-groups a").forEach(link => {
  try {
    const target = new URL(link.href, location.href);
    if (target.origin === location.origin && target.pathname === location.pathname && (!target.hash || location.pathname !== "/")) link.setAttribute("aria-current","page");
  } catch {}
});

const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");
const siteHeader = document.querySelector(".site-header");
const menuLabel = menuButton?.querySelector(".sr-only");
const closeMenu = ({focus=false} = {}) => {
  menuButton?.setAttribute("aria-expanded", "false");
  mainNav?.classList.remove("open");
  document.body.classList.remove("menu-open");
  if (menuLabel) menuLabel.textContent = "Menü öffnen";
  if (focus) menuButton?.focus();
};
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  if (!open) return closeMenu();
  menuButton.setAttribute("aria-expanded", "true");
  mainNav?.classList.add("open");
  document.body.classList.add("menu-open");
  if (menuLabel) menuLabel.textContent = "Menü schließen";
  if (matchMedia("(max-width: 1100px)").matches) {
    requestAnimationFrame(() => mainNav?.querySelector(".mobile-nav-search input")?.focus());
  }
});
mainNav?.addEventListener("click", event => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("click", event => {
  if (mainNav?.classList.contains("open") && siteHeader && !siteHeader.contains(event.target)) closeMenu();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && mainNav?.classList.contains("open")) closeMenu({focus:true});
});
addEventListener("resize", () => {
  if (innerWidth > 1100 && mainNav?.classList.contains("open")) closeMenu();
});

let lastHeaderScrollY = scrollY;
let headerTicking = false;
const updateHeaderOnScroll = () => {
  headerTicking = false;
  if (!siteHeader || mainNav?.classList.contains("open") || siteHeader.matches(":focus-within")) {
    siteHeader?.classList.remove("header-hidden");
    lastHeaderScrollY = scrollY;
    return;
  }
  const currentY = Math.max(0, scrollY);
  const delta = currentY - lastHeaderScrollY;
  if (currentY < 110) siteHeader.classList.remove("header-hidden");
  else if (delta > 8) siteHeader.classList.add("header-hidden");
  else if (delta < -6) siteHeader.classList.remove("header-hidden");
  lastHeaderScrollY = currentY;
};
addEventListener("scroll", () => {
  if (headerTicking) return;
  headerTicking = true;
  requestAnimationFrame(updateHeaderOnScroll);
}, {passive:true});

const footerGroups=[...document.querySelectorAll("[data-footer-group]")];
const footerMobileQuery=matchMedia("(max-width:760px)");
const syncFooterGroups=()=>footerGroups.forEach(group=>{group.open=!footerMobileQuery.matches;});
syncFooterGroups();
footerMobileQuery.addEventListener?.("change",syncFooterGroups);

const countdowns = [...document.querySelectorAll("[data-countdown]")];
function updateCountdowns() {
  const now = Date.now();
  for (const element of countdowns) {
    const remaining = new Date(element.dataset.countdown).getTime() - now;
    if (!Number.isFinite(remaining) || remaining <= 0) {
      element.textContent = "Angebot abgelaufen";
      element.closest(".deal-card")?.remove();
      continue;
    }
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    element.textContent = `Endet in ${days ? `${days} T. ` : ""}${hours} Std. ${minutes} Min.`;
  }
}
updateCountdowns();
if (countdowns.length) setInterval(updateCountdowns, 60000);

document.addEventListener("click", event => {
  const link=event.target.closest("[data-lightbox-link]");
  if(!link)return;
  event.preventDefault();
  let dialog=document.querySelector(".image-lightbox-dialog");
  if(!dialog){
    dialog=document.createElement("dialog");
    dialog.className="image-lightbox-dialog";
    dialog.innerHTML='<button type="button" class="image-lightbox-close" aria-label="Bildansicht schließen">×</button><img alt=""><a class="image-lightbox-original" target="_blank" rel="noopener">Original öffnen ↗</a>';
    document.body.append(dialog);
    dialog.querySelector(".image-lightbox-close").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
  }
  const image=dialog.querySelector("img");
  image.src=link.href;
  image.alt=link.querySelector("img")?.alt || "Produktbild";
  dialog.querySelector(".image-lightbox-original").href=link.href;
  dialog.showModal();
});

const detail = document.querySelector(".detail");
if (detail) {
  const share = document.createElement("section");
  share.className = "share-tools";
  const pageUrl = location.href, title = document.title;
  share.innerHTML = `<h2>Angebot teilen</h2><div><button type="button" data-copy-link>Link kopieren</button><a href="https://wa.me/?text=${encodeURIComponent(`${title} ${pageUrl}`)}" rel="noopener">WhatsApp</a><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" rel="noopener">Facebook</a><a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}" rel="noopener">X</a></div><p data-copy-status aria-live="polite"></p>`;
  detail.append(share);
  share.querySelector("[data-copy-link]")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(pageUrl); share.querySelector("[data-copy-status]").textContent = "Link kopiert."; }
    catch { share.querySelector("[data-copy-status]").textContent = "Kopieren war nicht möglich."; }
  });
}

const promo = document.querySelector("[data-promo-popup]");
try { if (localStorage.getItem("angebotslotse-promo-closed") === "1") promo?.remove(); } catch {}
document.querySelector("[data-promo-close]")?.addEventListener("click", () => {
  promo?.remove();
  try { localStorage.setItem("angebotslotse-promo-closed", "1"); } catch {}
});

for (const card of document.querySelectorAll(".deal-card")) {
  const target = card.querySelector(".card-cta");
  if (!target) continue;
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", target.getAttribute("aria-label") || "Zum Angebot");
  card.addEventListener("click", event => { if (!event.target.closest("a,button,input,select")) location.href = target.href; });
  card.addEventListener("keydown", event => { if (event.key === "Enter") target.click(); });
}

document.querySelectorAll("[data-copy-code]").forEach(link => link.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(link.dataset.copyCode); }
  catch { /* The affiliate destination still opens when clipboard access is unavailable. */ }
}));


const spreadshop = document.querySelector("[data-spreadshop]");
const spreadshopButton = spreadshop?.querySelector("[data-load-spreadshop]");
spreadshopButton?.addEventListener("click", () => {
  if (!spreadshop || spreadshop.dataset.loaded === "true") return;
  const status = spreadshop.querySelector("[data-spreadshop-status]");
  const shopName = spreadshop.dataset.shopName;
  const prefix = spreadshop.dataset.shopPrefix;
  const scriptUrl = spreadshop.dataset.shopScript;
  if (!shopName || !prefix || !scriptUrl) {
    if (status) status.textContent = "Der Shop konnte nicht konfiguriert werden.";
    return;
  }
  spreadshop.dataset.loaded = "true";
  spreadshopButton.disabled = true;
  if (status) status.textContent = "Spreadshop wird geladen …";
  window.spread_shop_config = {
    shopName,
    prefix,
    baseId: spreadshop.id,
    locale: "de_DE",
    updateMetadata: false,
    usePushState: false
  };
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.async = true;
  script.addEventListener("error", () => {
    spreadshop.dataset.loaded = "false";
    spreadshopButton.disabled = false;
    if (status) status.textContent = "Spreadshop konnte nicht geladen werden. Du kannst den Shop separat öffnen.";
  }, {once:true});
  document.body.append(script);
});

const instantGamingLoad = document.querySelector("[data-ig-banner-load]");
instantGamingLoad?.addEventListener("click", () => {
  const host = document.querySelector("[data-ig-banner-host]");
  const note = document.querySelector("[data-ig-banner-note]");
  const igr = instantGamingLoad.dataset.igr;
  if (!host || !igr || instantGamingLoad.dataset.loaded === "true") return;
  instantGamingLoad.dataset.loaded = "true";
  instantGamingLoad.disabled = true;
  host.hidden = false;
  if (note) note.textContent = "Instant-Gaming-Partnerbanner wird geladen …";
  window.igBannerConfig = { lang: "de", igr, banners: ["my-banner"] };
  const script = document.createElement("script");
  script.src = "https://www.instant-gaming.com/api/banner/partner/loader.js";
  script.async = true;
  script.addEventListener("load", () => {
    instantGamingLoad.hidden = true;
    if (note) note.textContent = "Externer Instant-Gaming-Inhalt wurde auf deinen Klick geladen.";
  }, {once:true});
  script.addEventListener("error", () => {
    instantGamingLoad.dataset.loaded = "false";
    instantGamingLoad.disabled = false;
    host.hidden = true;
    if (note) note.textContent = "Der Partnerbanner konnte nicht geladen werden. Der direkte Affiliate-Link bleibt verfügbar.";
  }, {once:true});
  document.body.append(script);
});

const WATCHLIST_KEY = "angebotslotse-watchlist-v1";
function readWatchlist() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
function writeWatchlist(items) {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items)); } catch {}
  updateWatchIndicators(items);
}
function watchItemFromElement(element) {
  const price = Number(element.dataset.watchPrice);
  return {
    id: element.dataset.watchId || "",
    title: element.dataset.watchTitle || "",
    merchant: element.dataset.watchMerchant || "",
    savedPrice: Number.isFinite(price) && price > 0 ? price : null,
    currency: element.dataset.watchCurrency || "EUR",
    url: element.dataset.watchUrl || location.href,
    targetPrice: null,
    savedAt: new Date().toISOString()
  };
}
function updateWatchIndicators(items = readWatchlist()) {
  const count = Object.keys(items).length;
  document.querySelectorAll("[data-watch-count]").forEach(node => {
    node.hidden = count === 0;
    node.textContent = String(count);
  });
  document.querySelectorAll("[data-watch-toggle]").forEach(button => {
    const saved = Boolean(items[button.dataset.watchId]);
    button.setAttribute("aria-pressed", String(saved));
    button.classList.toggle("saved", saved);
    const label = button.querySelector("span");
    if (label) label.textContent = saved ? "Gemerkt" : "Merken";
    if (button.firstChild && button.firstChild.nodeType === Node.TEXT_NODE) button.firstChild.textContent = saved ? "♥ " : "♡ ";
  });
  document.querySelectorAll("[data-watch-panel]").forEach(panel => {
    const saved = items[panel.dataset.watchId];
    const input = panel.querySelector("[data-watch-target]");
    if (input && saved && saved.targetPrice != null) input.value = String(saved.targetPrice);
    const remove = panel.querySelector("[data-watch-remove]");
    if (remove) remove.hidden = !saved;
    const save = panel.querySelector("[data-watch-save]");
    if (save) save.textContent = saved ? "Aktualisieren" : "Merken";
  });
}
document.querySelectorAll("[data-watch-toggle]").forEach(button => button.addEventListener("click", () => {
  const items = readWatchlist();
  const id = button.dataset.watchId;
  if (!id) return;
  if (items[id]) delete items[id];
  else items[id] = watchItemFromElement(button);
  writeWatchlist(items);
}));
document.querySelectorAll("[data-watch-panel]").forEach(panel => {
  const save = panel.querySelector("[data-watch-save]");
  const remove = panel.querySelector("[data-watch-remove]");
  const status = panel.querySelector("[data-watch-status]");
  save && save.addEventListener("click", () => {
    const item = watchItemFromElement(panel);
    const input = panel.querySelector("[data-watch-target]");
    const target = Number(input && input.value);
    item.targetPrice = Number.isFinite(target) && target > 0 ? target : null;
    const items = readWatchlist();
    items[item.id] = Object.assign({}, items[item.id] || {}, item);
    writeWatchlist(items);
    if (status) status.textContent = item.targetPrice ? "Gespeichert. Wunschpreis wird beim nächsten Besuch mit dem aktuellen Stand verglichen." : "Angebot wurde gemerkt.";
  });
  remove && remove.addEventListener("click", () => {
    const items = readWatchlist();
    delete items[panel.dataset.watchId];
    writeWatchlist(items);
    const input = panel.querySelector("[data-watch-target]");
    if (input) input.value = "";
    if (status) status.textContent = "Aus der Merkliste entfernt.";
  });
});

const watchCatalogNode = document.querySelector("#watch-catalog");
const watchlistRoot = document.querySelector("[data-watchlist]");
if (watchlistRoot && watchCatalogNode) {
  let catalog = {};
  try { catalog = JSON.parse(watchCatalogNode.textContent || "{}"); } catch {}
  const renderWatchlist = () => {
    const items = readWatchlist();
    watchlistRoot.replaceChildren();
    let reached = 0;
    for (const entry of Object.entries(items)) {
      const id = entry[0], saved = entry[1];
      const live = catalog[id] || {};
      const currentPrice = Number(live.currentPrice);
      const targetPrice = Number(saved.targetPrice);
      const hasCurrent = Number.isFinite(currentPrice) && currentPrice > 0;
      const hasTarget = Number.isFinite(targetPrice) && targetPrice > 0;
      const hit = hasCurrent && hasTarget && currentPrice <= targetPrice;
      if (hit) reached += 1;

      const article = document.createElement("article");
      article.className = "watchlist-item" + (hit ? " target-hit" : "");

      if (live.imageUrl) {
        const imageLink = document.createElement("a");
        imageLink.className = "watchlist-image";
        imageLink.href = live.url || saved.url || "#";
        const img = document.createElement("img");
        img.src = live.imageUrl;
        img.alt = "";
        img.loading = "lazy";
        imageLink.append(img);
        article.append(imageLink);
      }

      const body = document.createElement("div");
      body.className = "watchlist-body";
      const merchant = document.createElement("span");
      merchant.className = "eyebrow";
      merchant.textContent = live.merchant || saved.merchant || "Angebot";
      const title = document.createElement("h2");
      const titleLink = document.createElement("a");
      titleLink.href = live.url || saved.url || "#";
      titleLink.textContent = live.title || saved.title || id;
      title.append(titleLink);
      body.append(merchant, title);

      const priceRow = document.createElement("div");
      priceRow.className = "watchlist-prices";
      const currency = live.currency || saved.currency || "EUR";
      const current = document.createElement("strong");
      current.textContent = hasCurrent ? new Intl.NumberFormat("de-DE",{style:"currency",currency:currency}).format(currentPrice) : "Aktuellen Preis prüfen";
      priceRow.append(current);
      if (hasTarget) {
        const target = document.createElement("span");
        target.textContent = "Wunschpreis: " + new Intl.NumberFormat("de-DE",{style:"currency",currency:currency}).format(targetPrice);
        priceRow.append(target);
      }
      body.append(priceRow);

      const state = document.createElement("p");
      state.className = "watchlist-state";
      state.textContent = hit ? "Wunschpreis erreicht" : hasTarget ? "Wunschpreis noch nicht erreicht" : "Ohne Wunschpreis gespeichert";
      body.append(state);

      const controls = document.createElement("div");
      controls.className = "watchlist-controls";
      const targetInput = document.createElement("input");
      targetInput.type = "number";
      targetInput.min = "0";
      targetInput.step = "0.01";
      targetInput.inputMode = "decimal";
      targetInput.placeholder = hasCurrent ? currentPrice.toFixed(2) : "Wunschpreis";
      if (hasTarget) targetInput.value = String(targetPrice);
      targetInput.setAttribute("aria-label","Wunschpreis");
      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "button";
      saveButton.textContent = "Wunschpreis speichern";
      saveButton.addEventListener("click", () => {
        const target = Number(targetInput.value);
        const all = readWatchlist();
        all[id] = Object.assign({}, saved, {targetPrice:Number.isFinite(target)&&target>0?target:null});
        writeWatchlist(all);
        renderWatchlist();
      });
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "button";
      removeButton.textContent = "Entfernen";
      removeButton.addEventListener("click", () => {
        const all = readWatchlist();
        delete all[id];
        writeWatchlist(all);
        renderWatchlist();
      });
      controls.append(targetInput, saveButton, removeButton);
      body.append(controls);
      article.append(body);
      watchlistRoot.append(article);
    }
    const count = Object.keys(items).length;
    const empty = document.querySelector("[data-watch-empty]");
    if (empty) empty.hidden = count > 0;
    const summary = document.querySelector("[data-watch-summary]");
    if (summary) summary.textContent = count ? count + " gemerkt · " + reached + " Wunschpreis" + (reached === 1 ? "" : "e") + " erreicht" : "";
    updateWatchIndicators(items);
  };
  renderWatchlist();
}
updateWatchIndicators();

// Angebotslotse: öffentliche Reports + Newsletter Double-Opt-in
(() => {
  const INTAKE_ENDPOINT = "https://asrklnfcwtgihvyfjiww.supabase.co/functions/v1/public-intake";
  const postIntake = async payload => {
    const response = await fetch(INTAKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
  };
  const setStatus=(node,text,kind="info")=>{ if(!node)return; node.textContent=text; node.dataset.kind=kind; };

  const dialog=document.querySelector("[data-report-dialog]");
  const openReport=()=>{
    if(!dialog)return;
    const status=dialog.querySelector("[data-report-status]");
    setStatus(status,"");
    if(typeof dialog.showModal==="function")dialog.showModal(); else dialog.setAttribute("open","");
  };
  const closeReport=()=>{ if(!dialog)return; if(typeof dialog.close==="function")dialog.close(); else dialog.removeAttribute("open"); };
  document.querySelectorAll("[data-report-open]").forEach(button=>button.addEventListener("click",openReport));
  document.querySelectorAll("[data-report-close]").forEach(button=>button.addEventListener("click",closeReport));

  const reportForm=document.querySelector("[data-report-form]");
  reportForm?.addEventListener("submit",async event=>{
    event.preventDefault();
    const status=reportForm.querySelector("[data-report-status]");
    const submit=reportForm.querySelector('button[type="submit"]');
    const fd=new FormData(reportForm);
    submit?.setAttribute("disabled","");
    setStatus(status,"Report wird gesendet …","info");
    const match=location.pathname.match(/\/angebote\/([^/]+)\.html$/);
    try {
      const data=await postIntake({
        kind:"report",
        pageUrl:location.href.split("#")[0],
        reportType:String(fd.get("reportType")||"other"),
        message:String(fd.get("message")||""),
        email:String(fd.get("email")||""),
        offerSlug:match?.[1]||"",
        website:String(fd.get("website")||""),
      });
      setStatus(status,`Danke – Report ${String(data.reportId||"").slice(0,8)} wurde aufgenommen.`, "success");
      reportForm.reset();
      setTimeout(closeReport,1400);
    } catch(error) {
      const rate=String(error?.message||"").includes("rate_limited");
      setStatus(status,rate?"Zu viele Meldungen in kurzer Zeit. Bitte später erneut versuchen.":"Report konnte gerade nicht gesendet werden. Bitte später erneut versuchen.","error");
    } finally { submit?.removeAttribute("disabled"); }
  });

  const newsletter=document.querySelector("[data-newsletter-form]");
  newsletter?.addEventListener("submit",async event=>{
    event.preventDefault();
    const status=newsletter.querySelector("[data-newsletter-status]");
    const submit=newsletter.querySelector('button[type="submit"]');
    const fd=new FormData(newsletter);
    submit?.setAttribute("disabled","");
    setStatus(status,"Anmeldung wird gespeichert …","info");
    try {
      const data=await postIntake({
        kind:"newsletter",
        email:String(fd.get("email")||""),
        consent:fd.get("consent")==="on",
        source:"website-home",
        website:String(fd.get("website")||""),
      });
      setStatus(status,data.state==="already_active"?"Diese Adresse ist bereits bestätigt.":"Fast geschafft: Bitte bestätige die E-Mail, die wir dir schicken.","success");
      newsletter.reset();
    } catch(error) {
      const rate=String(error?.message||"").includes("rate_limited");
      setStatus(status,rate?"Zu viele Versuche in kurzer Zeit. Bitte später erneut versuchen.":"Anmeldung konnte gerade nicht gespeichert werden.","error");
    } finally { submit?.removeAttribute("disabled"); }
  });
})();

/* Angebotslotse: robuster Medien-Fallback */
(() => {
  const mediaImages=document.querySelectorAll('img[data-soft-fallback], img.partner-creative, .creator-update-card img');
  mediaImages.forEach(img=>{
    const replaceBroken=()=>{
      if(img.dataset.fallbackApplied==="1")return;
      img.dataset.fallbackApplied="1";
      const fallback=document.createElement("span");
      fallback.className="soft-media-fallback";
      const type=img.dataset.softFallback || (img.classList.contains("partner-creative")?"partner":"video");
      fallback.textContent=type==="video"?"▶ Beitrag":type==="partner"?"Partner-Angebot":"Angebotslotse";
      img.replaceWith(fallback);
    };
    if(img.complete&&img.naturalWidth===0)replaceBroken();
    else img.addEventListener("error",replaceBroken,{once:true});
  });
})();
