const input = document.querySelector("#search");
const cards = [...document.querySelectorAll("[data-search]")];
const noResults = document.querySelector("#no-results");
const params = new URLSearchParams(location.search); const category = params.get("kategorie");
function filter() { const q = (input?.value || "").trim().toLowerCase(); let visible=0; for (const card of cards) { const ok=card.dataset.search.includes(q) && (!category || card.dataset.search.includes(category)); card.hidden=!ok; if(ok) visible++; } if(noResults) noResults.hidden=visible>0; }
input?.addEventListener("input",filter); filter();

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

const promo = document.querySelector("[data-promo-popup]");
try { if (localStorage.getItem("angebotslotse-promo-closed") === "1") promo?.remove(); } catch {}
document.querySelector("[data-promo-close]")?.addEventListener("click", () => {
  promo?.remove();
  try { localStorage.setItem("angebotslotse-promo-closed", "1"); } catch {}
});
