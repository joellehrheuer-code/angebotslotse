const input = document.querySelector("#search");
const cards = [...document.querySelectorAll("[data-search]")];
const noResults = document.querySelector("#no-results");
const params = new URLSearchParams(location.search); const category = params.get("kategorie");
function filter() { const q = (input?.value || "").trim().toLowerCase(); let visible=0; for (const card of cards) { const ok=card.dataset.search.includes(q) && (!category || card.dataset.search.includes(category)); card.hidden=!ok; if(ok) visible++; } if(noResults) noResults.hidden=visible>0; }
input?.addEventListener("input",filter); filter();

const categorySearch = document.querySelector("[data-offer-search]");
const categorySort = document.querySelector("[data-offer-sort]");
const sortGrid = document.querySelector("[data-sort-grid]");
const filterEmpty = document.querySelector("[data-no-filter-results]");
const forwardedSearch = params.get("suche");
if (forwardedSearch && categorySearch) categorySearch.value = forwardedSearch;
function updateCategoryListing() {
  if (!sortGrid) return;
  const query = (categorySearch?.value || "").trim().toLowerCase();
  const rows = [...sortGrid.querySelectorAll(".deal-card")];
  const mode = categorySort?.value || "current";
  rows.sort((a,b) => mode === "ending" ? (a.dataset.end || "9999").localeCompare(b.dataset.end || "9999") : mode === "discount" ? Number(b.dataset.discount)-Number(a.dataset.discount) : mode === "price" ? (Number(a.dataset.price || Infinity)-Number(b.dataset.price || Infinity)) : (b.dataset.updated || "").localeCompare(a.dataset.updated || ""));
  let visible = 0;
  for (const row of rows) { row.hidden = !row.dataset.search.includes(query); if (!row.hidden) visible += 1; sortGrid.append(row); }
  if (filterEmpty) filterEmpty.hidden = visible > 0;
}
categorySearch?.addEventListener("input", updateCategoryListing);
categorySort?.addEventListener("change", updateCategoryListing);
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
document.querySelectorAll("[data-media]").forEach(image=>{const done=()=>image.closest(".has-media")?.classList.add("loaded");if(image.complete)done();else{image.addEventListener("load",done,{once:true});image.addEventListener("error",done,{once:true});}});

document.querySelectorAll("[data-history-range]").forEach(button=>button.addEventListener("click",()=>{
  const history=button.closest(".price-history"),range=button.dataset.historyRange;
  history?.querySelectorAll("[data-history-range]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
  history?.querySelectorAll("[data-history-panel]").forEach(panel=>panel.hidden=panel.dataset.historyPanel!==range);
}));

const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  mainNav?.classList.toggle("open", open);
});
mainNav?.addEventListener("click", event => {
  if (event.target.closest("a")) { menuButton?.setAttribute("aria-expanded", "false"); mainNav.classList.remove("open"); }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && mainNav?.classList.contains("open")) {
    menuButton?.setAttribute("aria-expanded", "false");
    mainNav.classList.remove("open");
    menuButton?.focus();
  }
});

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
