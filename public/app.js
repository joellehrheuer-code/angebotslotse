const input = document.querySelector("#search");
const cards = [...document.querySelectorAll("[data-search]")];
const noResults = document.querySelector("#no-results");
const params = new URLSearchParams(location.search); const category = params.get("kategorie");
function filter() { const q = (input?.value || "").trim().toLowerCase(); let visible=0; for (const card of cards) { const ok=card.dataset.search.includes(q) && (!category || card.dataset.search.includes(category)); card.hidden=!ok; if(ok) visible++; } if(noResults) noResults.hidden=visible>0; }
input?.addEventListener("input",filter); filter();
