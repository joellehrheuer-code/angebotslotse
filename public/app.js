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

const quickSearchDataNode=document.querySelector("#quick-search-data");
let quickSearchData={products:[],shops:[],categories:[]};
try{quickSearchData=JSON.parse(quickSearchDataNode?.textContent||"{}");}catch{}
const QUICK_SEARCH_RECENT_KEY="angebotslotse-search-recent-v1";
const readRecentSearches=()=>{try{const rows=JSON.parse(localStorage.getItem(QUICK_SEARCH_RECENT_KEY)||"[]");return Array.isArray(rows)?rows.filter(Boolean).slice(0,5):[];}catch{return [];}};
const rememberSearch=value=>{const q=String(value||"").trim();if(q.length<2)return;try{const next=[q,...readRecentSearches().filter(item=>normalizeSearch(item)!==normalizeSearch(q))].slice(0,5);localStorage.setItem(QUICK_SEARCH_RECENT_KEY,JSON.stringify(next));}catch{}};
const moneyQuick=(value,currency="EUR")=>new Intl.NumberFormat("de-DE",{style:"currency",currency,maximumFractionDigits:2}).format(Number(value));
const makeSuggestion=(tag,className)=>{const el=document.createElement(tag);el.className=className;return el;};
function renderSmartSearch(form){
  const field=form.querySelector('input[type="search"]');
  const panel=form.querySelector("[data-search-panel]");
  if(!field||!panel)return;
  panel.setAttribute("role","listbox");
  if(!panel.getAttribute("aria-label"))panel.setAttribute("aria-label","Suchvorschläge");
  field.setAttribute("role","combobox");
  field.setAttribute("aria-autocomplete","list");
  field.setAttribute("aria-haspopup","listbox");
  field.setAttribute("aria-expanded","false");
  let activeIndex=-1;
  const options=()=>Array.from(panel.querySelectorAll('[role="option"]'));
  const setActive=index=>{
    const items=options();
    if(!items.length){activeIndex=-1;field.removeAttribute("aria-activedescendant");return;}
    activeIndex=Math.max(0,Math.min(index,items.length-1));
    items.forEach((item,i)=>item.setAttribute("aria-selected",String(i===activeIndex)));
    const active=items[activeIndex];
    field.setAttribute("aria-activedescendant",active.id);
    active.scrollIntoView({block:"nearest"});
  };
  const close=()=>{
    panel.hidden=true;
    panel.replaceChildren();
    activeIndex=-1;
    field.setAttribute("aria-expanded","false");
    field.removeAttribute("aria-activedescendant");
  };
  const render=()=>{
    const q=field.value.trim();
    const recent=readRecentSearches();
    if(q.length<2&&q.length>0){close();return;}
    const products=q.length>=2?(quickSearchData.products||[]).filter(row=>searchMatches([row.title,row.brand,row.merchant,row.category].join(" "),q)).slice(0,4);
    const shops=q.length>=2?(quickSearchData.shops||[]).filter(row=>searchMatches(row.name,q)).slice(0,3):[];
    const categories=q.length>=2?(quickSearchData.categories||[]).filter(row=>searchMatches(row.name,q)).slice(0,3):(quickSearchData.categories||[]).slice().sort((a,b)=>(Number(b.count)||0)-(Number(a.count)||0)).slice(0,4);
    panel.replaceChildren();
    let optionIndex=0;
    const addGroup=(title,rows,kind)=>{
      if(!rows.length)return;
      const section=makeSuggestion("section","search-suggest-group");
      section.setAttribute("role","group");
      section.setAttribute("aria-label",title);
      const heading=makeSuggestion("strong","search-suggest-heading");heading.textContent=title;heading.setAttribute("aria-hidden","true");section.append(heading);
      rows.forEach(row=>{
        const link=makeSuggestion("a","search-suggest-item "+kind);link.href=row.url;
        link.setAttribute("role","option");
        link.setAttribute("aria-selected","false");
        link.id=(panel.id||"search-panel")+"-option-"+optionIndex++;
        if(kind==="product"&&row.imageUrl){const img=document.createElement("img");img.src=row.imageUrl;img.alt="";img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";img.dataset.softFallback="product";link.append(img);}
        const copy=makeSuggestion("span","search-suggest-copy");
        const badge=makeSuggestion("span","search-suggest-kind");badge.textContent=kind==="product"?"Produkt":kind==="shop"?"Shop":kind==="category"?"Kategorie":"Suche";copy.append(badge);
        const name=makeSuggestion("b","");name.textContent=kind==="product"?row.title:row.name;copy.append(name);
        const meta=makeSuggestion("small","");
        if(kind==="product")meta.textContent=[row.brand,row.merchant,row.category].filter(Boolean).join(" · ");
        else if(kind==="recent")meta.textContent="Erneut suchen";
        else meta.textContent=String(row.count||0)+(kind==="shop"?" Deals":" Angebote");
        copy.append(meta);link.append(copy);
        if(kind==="product"&&row.price!=null){const price=makeSuggestion("em","");price.textContent=moneyQuick(row.price,row.currency);link.append(price);}
        section.append(link);
      });
      panel.append(section);
    };
    if(q.length<2&&recent.length){
      addGroup("Zuletzt gesucht",recent.map(name=>({name,url:form.action+"?suche="+encodeURIComponent(name)})),"recent");
    }
    addGroup("Produkte",products,"product");
    addGroup("Shops",shops,"shop");
    addGroup(q.length<2?"Beliebte Kategorien":"Kategorien",categories,"category");
    if(!panel.childElementCount){const empty=makeSuggestion("p","search-suggest-empty");empty.textContent="Keine direkte Empfehlung – Enter zeigt dir alle passenden Treffer.";panel.append(empty);}
    activeIndex=-1;
    field.removeAttribute("aria-activedescendant");
    panel.hidden=false;field.setAttribute("aria-expanded","true");
  };
  field.addEventListener("input",render);
  field.addEventListener("focus",render);
  form.addEventListener("submit",()=>rememberSearch(field.value));
  field.addEventListener("keydown",event=>{
    if(event.key==="Escape"){close();return;}
    if(event.key==="ArrowDown"){
      if(panel.hidden)render();
      const items=options();
      if(items.length){event.preventDefault();setActive(activeIndex<items.length-1?activeIndex+1:0);}
      return;
    }
    if(event.key==="ArrowUp"){
      const items=options();
      if(items.length&&!panel.hidden){event.preventDefault();setActive(activeIndex>0?activeIndex-1:items.length-1);}
      return;
    }
    if(event.key==="Enter"&&activeIndex>=0&&!panel.hidden){
      const active=options()[activeIndex];
      if(active){event.preventDefault();active.click();}
    }
  });
  panel.addEventListener("pointermove",event=>{
    const option=event.target.closest('[role="option"]');
    if(!option)return;
    const index=options().indexOf(option);
    if(index>=0)setActive(index);
  });
  document.addEventListener("pointerdown",event=>{if(!form.contains(event.target))close();});
}
document.querySelectorAll("[data-smart-search]").forEach(renderSmartSearch);


const premiumHero=document.querySelector("[data-hero-parallax]");
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)");
if(premiumHero&&matchMedia("(pointer:fine)").matches&&!reduceMotion.matches){
  premiumHero.addEventListener("pointermove",event=>{
    const box=premiumHero.getBoundingClientRect();
    const x=((event.clientX-box.left)/box.width-.5)*8;
    const y=((event.clientY-box.top)/box.height-.5)*8;
    premiumHero.style.setProperty("--hero-x",x.toFixed(2)+"px");
    premiumHero.style.setProperty("--hero-y",y.toFixed(2)+"px");
  });
  premiumHero.addEventListener("pointerleave",()=>{
    premiumHero.style.setProperty("--hero-x","0px");
    premiumHero.style.setProperty("--hero-y","0px");
  });
}

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
const mobileFilterToggle = document.querySelector("[data-filter-mobile-toggle]");
const mobileFilterCount = document.querySelector("[data-filter-mobile-count]");
const listingFilters = document.querySelector("[data-listing-filters]");
mobileFilterToggle?.addEventListener("click", () => {
  if (!listingFilters) return;
  const open = listingFilters.classList.toggle("mobile-open");
  mobileFilterToggle.setAttribute("aria-expanded", String(open));
  if (open) listingFilters.querySelector("input,select,button")?.focus({preventScroll:true});
});
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
  if (mobileFilterCount) mobileFilterCount.textContent = String(visible) + (visible === 1 ? " Angebot" : " Angebote");
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
const liveStoreList=document.querySelector("[data-live-store-list]");
if(liveStoreList){
  const liveStoreButtons=[...document.querySelectorAll("[data-live-sort]")];
  const liveStoreCards=[...liveStoreList.querySelectorAll("[data-live-store]")];
  const sortLiveStores=mode=>{
    const first=new Map(liveStoreCards.map(card=>[card,card.getBoundingClientRect()]));
    const sorted=[...liveStoreCards].sort((a,b)=>mode==="az"
      ? String(a.dataset.storeName||"").localeCompare(String(b.dataset.storeName||""),"de")
      : Number(b.dataset.storeCount||0)-Number(a.dataset.storeCount||0) || String(a.dataset.storeName||"").localeCompare(String(b.dataset.storeName||""),"de"));
    liveStoreList.classList.add("is-sorting");
    sorted.forEach((card,index)=>{
      liveStoreList.append(card);
      const rank=card.querySelector("[data-live-rank]");
      if(rank)rank.textContent=String(index+1);
    });
    liveStoreButtons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.liveSort===mode)));
    if(!reducedMotion && typeof Element.prototype.animate==="function"){
      sorted.forEach((card,index)=>{
        const before=first.get(card);
        const after=card.getBoundingClientRect();
        if(!before||!after)return;
        const dx=before.left-after.left,dy=before.top-after.top;
        if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
        card.animate(
          [{transform:`translate(${dx}px,${dy}px) scale(.985)`,opacity:.82},{transform:"translate(0,0) scale(1)",opacity:1}],
          {duration:440+index*35,easing:"cubic-bezier(.2,.8,.2,1)"}
        );
      });
    }
    setTimeout(()=>liveStoreList.classList.remove("is-sorting"),reduceMotion?0:620);
  };
  liveStoreButtons.forEach(button=>button.addEventListener("click",()=>sortLiveStores(button.dataset.liveSort||"deals")));
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
// Measure the header after wrapping, font loading and viewport changes.
const syncHeaderGeometry = () => {
  if (!siteHeader) return;
  const top = Number.parseFloat(getComputedStyle(siteHeader).top) || 0;
  const bottom = Math.ceil(top + siteHeader.offsetHeight);
  document.documentElement.style.setProperty("--header-overlay-top", bottom + "px");
};
syncHeaderGeometry();
if (siteHeader && typeof ResizeObserver !== "undefined") {
  new ResizeObserver(syncHeaderGeometry).observe(siteHeader);
}
addEventListener("resize", syncHeaderGeometry);

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

const stickyOfferBar=document.querySelector("[data-sticky-offer-bar]");
const primaryOfferAction=document.querySelector(".offer-primary-action");
if(stickyOfferBar&&primaryOfferAction){
  const setSticky=visible=>{stickyOfferBar.hidden=!visible;document.body.classList.toggle("has-sticky-offer",visible);};
  if("IntersectionObserver" in window){
    new IntersectionObserver(entries=>setSticky(!entries[0].isIntersecting),{threshold:.05}).observe(primaryOfferAction);
  }else{
    const sync=()=>setSticky(scrollY>primaryOfferAction.offsetTop+primaryOfferAction.offsetHeight);
    addEventListener("scroll",sync,{passive:true});sync();
  }
}

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

document.querySelectorAll("[data-copy-code]").forEach(button => button.addEventListener("click", async () => {
  const host = button.closest(".detail-voucher");
  const status = host?.querySelector("[data-copy-code-status]");
  const code = button.dataset.copyCode || "";
  try {
    await navigator.clipboard.writeText(code);
    if (status) status.textContent = "Code kopiert.";
    const previous = button.textContent;
    button.textContent = "Kopiert ✓";
    setTimeout(() => { button.textContent = previous; if (status) status.textContent = ""; }, 1800);
  } catch {
    if (status) status.textContent = "Kopieren war nicht möglich. Markiere den Code manuell.";
  }
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
  let stored = false;
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
    stored = true;
  } catch {}
  updateWatchIndicators(items);
  return stored;
}
function showUiToast(message, kind = "info") {
  let toast = document.querySelector("[data-ui-toast]");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "ui-toast";
    toast.dataset.uiToast = "";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.classList.add("show");
  clearTimeout(showUiToast.timer);
  showUiToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
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
  const wasSaved = Boolean(items[id]);
  if (wasSaved) delete items[id];
  else items[id] = watchItemFromElement(button);
  const stored = writeWatchlist(items);
  if (!stored) {
    showUiToast("Merkliste konnte in diesem Browser nicht gespeichert werden.", "error");
    return;
  }
  showUiToast(wasSaved ? "Aus der Merkliste entfernt." : "Zur Merkliste hinzugefügt.", wasSaved ? "info" : "success");
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(INTAKE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let data = null;
      try { data = await response.json(); } catch (error) {
        if (controller.signal.aborted) throw error;
      }
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      return data;
    } finally { clearTimeout(timeout); }
  };
  const setStatus=(node,text,kind="info")=>{ if(!node)return; node.textContent=text; node.dataset.kind=kind; };
  const getCommunitySnapshot = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(INTAKE_ENDPOINT + "?community=1", {
        headers: { "Accept": "application/json" },
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      return data;
    } finally { clearTimeout(timeout); }
  };

  let communityRotateTimer = 0;
  const renderCommunitySnapshot = data => {
    const visits = Math.max(0, Number(data?.visits || 0));
    const reviewCount = Math.max(0, Number(data?.reviewCount || 0));
    const rating = Number(data?.ratingAverage);
    const number = new Intl.NumberFormat("de-DE");

    document.querySelectorAll("[data-community-visits]").forEach(node => { node.textContent = number.format(visits); });
    document.querySelectorAll("[data-community-review-count]").forEach(node => { node.textContent = number.format(reviewCount); });
    document.querySelectorAll("[data-community-rating]").forEach(node => {
      node.textContent = reviewCount > 0 && Number.isFinite(rating) ? rating.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}) : "–";
    });
    document.querySelectorAll("[data-community-visits-wrap],[data-community-visits-separator]").forEach(node => { node.hidden = false; });
    document.querySelectorAll("[data-community-rating-wrap],[data-community-rating-separator]").forEach(node => { node.hidden = reviewCount === 0; });

    const list = document.querySelector("[data-community-review-list]");
    if (!list) return;
    const reviews = Array.isArray(data?.reviews) ? data.reviews.filter(item => item && item.comment) : [];
    if (communityRotateTimer) clearInterval(communityRotateTimer);

    if (!reviews.length) {
      list.replaceChildren();
      const empty = document.createElement("article");
      empty.className = "community-review-empty";
      const strong = document.createElement("strong");
      strong.textContent = "Noch keine freigegebenen Bewertungen.";
      const p = document.createElement("p");
      p.textContent = "Du kannst die erste echte Bewertung einreichen.";
      empty.append(strong,p);
      list.append(empty);
      return;
    }

    let offset = 0;
    const paint = () => {
      list.replaceChildren();
      const count = Math.min(3,reviews.length);
      for (let i=0;i<count;i+=1) {
        const item = reviews[(offset+i)%reviews.length];
        const card = document.createElement("article");
        card.className = "community-review-card";
        const head = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = item.name || "Anonym";
        const stars = document.createElement("span");
        const score = Math.max(1,Math.min(5,Number(item.rating)||0));
        stars.textContent = "★".repeat(score) + "☆".repeat(5-score);
        stars.setAttribute("aria-label", score + " von 5 Sternen");
        head.append(name,stars);
        const quote = document.createElement("p");
        quote.textContent = item.comment;
        card.append(head,quote);
        if (item.createdAt) {
          const time = document.createElement("time");
          const date = new Date(item.createdAt);
          if (!Number.isNaN(date.getTime())) {
            time.dateTime = date.toISOString();
            time.textContent = new Intl.DateTimeFormat("de-DE",{dateStyle:"medium"}).format(date);
            card.append(time);
          }
        }
        list.append(card);
      }
    };
    paint();
    if (reviews.length > 3) {
      communityRotateTimer = setInterval(() => { offset = (offset + 1) % reviews.length; paint(); }, 7000);
    }
  };

  const loadCommunity = async () => {
    if (!document.querySelector("[data-community-visits], [data-community-root]")) return;
    let counted = false;
    try { counted = sessionStorage.getItem("angebotslotse-community-visit-v1") === "1"; } catch {}
    try {
      let data;
      if (!counted) {
        try {
          data = await postIntake({ kind:"visit", source:"website" });
          try { sessionStorage.setItem("angebotslotse-community-visit-v1","1"); } catch {}
        } catch {
          data = await getCommunitySnapshot();
        }
      } else {
        data = await getCommunitySnapshot();
      }
      renderCommunitySnapshot(data);
    } catch {
      document.querySelectorAll("[data-community-visits-wrap],[data-community-rating-wrap],[data-community-visits-separator],[data-community-rating-separator]").forEach(node => { node.hidden = true; });
    }
  };
  loadCommunity();

  try {
    const pendingRating=Number(sessionStorage.getItem("angebotslotse-review-pending-rating-v1"));
    if(pendingRating>=1&&pendingRating<=5){
      const input=document.querySelector(`[data-community-review-form] input[name="rating"][value="${pendingRating}"]`);
      if(input)input.checked=true;
      sessionStorage.removeItem("angebotslotse-review-pending-rating-v1");
    }
  } catch {}

  const communityReviewForm = document.querySelector("[data-community-review-form]");
  communityReviewForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const status = communityReviewForm.querySelector("[data-community-review-status]");
    const submit = communityReviewForm.querySelector('button[type="submit"]');
    const fd = new FormData(communityReviewForm);
    submit?.setAttribute("disabled","");
    setStatus(status,"Bewertung wird gesendet …","info");
    try {
      const data = await postIntake({
        kind:"review",
        rating:Number(fd.get("rating")),
        displayName:String(fd.get("displayName")||""),
        comment:String(fd.get("comment")||""),
        source:"website-home",
        website:String(fd.get("website")||""),
      });
      const duplicate = data.state === "already_submitted" || data.state === "already_approved";
      setStatus(status,duplicate
        ? "Diese Bewertung wurde bereits eingereicht."
        : "Danke! Deine Bewertung wurde gespeichert und erscheint nach kurzer Prüfung.","success");
      try { localStorage.setItem("angebotslotse-review-complete-v1","1"); localStorage.removeItem("angebotslotse-review-dismissed-until-v1"); } catch {}
      if (!duplicate) communityReviewForm.reset();
    } catch(error) {
      const message=String(error?.message||"");
      setStatus(status,
        message.includes("rate_limited")
          ? "Zu viele Bewertungen in kurzer Zeit. Bitte später erneut versuchen."
          : "Bewertung konnte gerade nicht gespeichert werden. Bitte später erneut versuchen.",
        "error"
      );
    } finally { submit?.removeAttribute("disabled"); }
  });

  const reviewNudge=document.querySelector("[data-review-nudge]");
  const reviewNudgeFormLink=reviewNudge?.querySelector("[data-review-nudge-open-form]");
  let reviewNudgeShown=false;
  let reviewInteractionCount=0;
  let reviewInteractionEligible=false;
  const reviewStorageNumber=key=>{try{return Number(localStorage.getItem(key)||0);}catch{return 0;}};
  const reviewIsComplete=()=>{try{return localStorage.getItem("angebotslotse-review-complete-v1")==="1";}catch{return false;}};
  const reviewIsDismissed=()=>reviewStorageNumber("angebotslotse-review-dismissed-until-v1")>Date.now();
  const closeReviewNudge=()=>{if(!reviewNudge)return;if(typeof reviewNudge.close==="function"&&reviewNudge.open)reviewNudge.close();else reviewNudge.removeAttribute("open");};
  const dismissReviewNudge=(days=7)=>{try{localStorage.setItem("angebotslotse-review-dismissed-until-v1",String(Date.now()+days*86400000));}catch{}closeReviewNudge();};
  const showReviewNudge=()=>{
    if(!reviewNudge||reviewNudgeShown||reviewIsComplete()||reviewIsDismissed()||document.querySelector("[data-report-dialog][open]"))return;
    reviewNudgeShown=true;
    if(typeof reviewNudge.showModal==="function")reviewNudge.showModal();else reviewNudge.setAttribute("open","");
  };
  setTimeout(()=>{reviewInteractionEligible=true;if(reviewInteractionCount>=3)showReviewNudge();},20000);
  setTimeout(showReviewNudge,75000);
  document.addEventListener("click",event=>{
    const meaningful=event.target.closest('a[href*="/angebote/"],[data-watch-toggle],[data-watch-save],[data-copy-code]');
    if(!meaningful)return;
    reviewInteractionCount+=1;
    if(reviewInteractionEligible&&reviewInteractionCount>=3)showReviewNudge();
  },{passive:true});
  reviewNudge?.querySelectorAll("[data-review-nudge-close],[data-review-nudge-later]").forEach(button=>button.addEventListener("click",()=>dismissReviewNudge(7)));
  reviewNudgeFormLink?.addEventListener("click",()=>closeReviewNudge());
  reviewNudge?.querySelectorAll("[data-review-nudge-rating]").forEach(button=>button.addEventListener("click",()=>{
    const rating=Number(button.dataset.reviewNudgeRating);
    try{sessionStorage.setItem("angebotslotse-review-pending-rating-v1",String(rating));}catch{}
    const input=document.querySelector(`[data-community-review-form] input[name="rating"][value="${rating}"]`);
    if(input){
      input.checked=true;
      closeReviewNudge();
      document.querySelector("#bewertung-abgeben")?.scrollIntoView({behavior:"smooth",block:"center"});
      setTimeout(()=>document.querySelector("[data-community-review-form] textarea")?.focus(),450);
    }else if(reviewNudgeFormLink?.href){
      location.assign(reviewNudgeFormLink.href);
    }
  }));

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
      const message=String(error?.message||"");
      const rate=message.includes("rate_limited");
      const mailSetup=message.includes("email_not_configured");
      const mailFailed=message.includes("confirmation_email_failed");
      setStatus(
        status,
        rate
          ?"Zu viele Versuche in kurzer Zeit. Bitte später erneut versuchen."
          :mailSetup
            ?"Der Newsletter-Mailversand wird gerade eingerichtet. Bitte später erneut versuchen."
            :mailFailed
              ?"Die Bestätigungsmail konnte gerade nicht versendet werden. Bitte später erneut versuchen."
              :"Anmeldung konnte gerade nicht gespeichert werden.",
        "error"
      );
    } finally { submit?.removeAttribute("disabled"); }
  });
})();

/* Angebotslotse: externe Creator-Player erst nach Klick laden */
(() => {
  document.querySelectorAll("[data-spotify-player-load]").forEach(button=>button.addEventListener("click",()=>{
    const host=button.closest(".creator-media-card")?.querySelector("[data-spotify-player-host]");
    const artist=String(button.dataset.spotifyArtist||"").trim();
    if(!host||!artist||host.dataset.loaded==="1")return;
    const frame=document.createElement("iframe");
    frame.src="https://open.spotify.com/embed/artist/"+encodeURIComponent(artist)+"?utm_source=generator";
    frame.title="J0JOEL auf Spotify";
    frame.loading="lazy";
    frame.allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    frame.setAttribute("allowfullscreen","");
    host.replaceChildren(frame);
    host.hidden=false;
    host.dataset.loaded="1";
    button.textContent="Spotify-Player geladen";
    button.setAttribute("disabled","");
  }));
})();

/* Angebotslotse: robuster Medien-Fallback */
(() => {
  const mediaImages=document.querySelectorAll('img[data-soft-fallback], img.partner-creative, .creator-update-card img, .search-suggest-item img');
  mediaImages.forEach(img=>{
    const replaceBroken=()=>{
      if(img.dataset.fallbackApplied==="1")return;
      img.dataset.fallbackApplied="1";
      const fallback=document.createElement("span");
      fallback.className="soft-media-fallback";
      const type=img.dataset.softFallback || (img.classList.contains("partner-creative")?"partner":"video");
      fallback.textContent=type==="video"?"▶ Beitrag":type==="partner"?"Partner-Angebot":type==="product"?"Bild nicht verfügbar":type==="brand"?"AL":"Angebotslotse";
      img.replaceWith(fallback);
    };
    if(img.complete&&img.naturalWidth===0)replaceBroken();
    else img.addEventListener("error",replaceBroken,{once:true});
  });
})();
