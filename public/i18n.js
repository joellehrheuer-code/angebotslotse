// Angebotslotse: progressive interface translations (product data is never machine-altered).
(() => {
  const dictionaries = {
    de: {},
    en: {"Angebote":"Deals","Alle Angebote":"All deals","Shops":"Stores","Shops & Händler":"Stores & merchants","Kategorien":"Categories","Suche":"Search","Suchen":"Search","Merkliste":"Watchlist","Konto":"Account","Startseite":"Home","Start":"Home","Mehr erfahren":"Learn more","Mehr anzeigen":"Show more","Filter":"Filters","Sortieren":"Sort","Aktuell":"Latest","Preis aufsteigend":"Price: low to high","Größter Rabatt":"Biggest discount","Endet bald":"Ending soon","Keine passenden Treffer":"No matching results","Zum Inhalt springen":"Skip to content","Zurück":"Back","Alle Shops":"All stores","Produkt oder Marke":"Product or brand"},
    fr: {"Angebote":"Offres","Alle Angebote":"Toutes les offres","Shops":"Boutiques","Shops & Händler":"Boutiques et marchands","Kategorien":"Catégories","Suche":"Recherche","Suchen":"Rechercher","Merkliste":"Favoris","Konto":"Compte","Startseite":"Accueil","Start":"Accueil","Mehr erfahren":"En savoir plus","Mehr anzeigen":"Afficher plus","Filter":"Filtres","Sortieren":"Trier","Aktuell":"Récent","Preis aufsteigend":"Prix croissant","Größter Rabatt":"Plus grande remise","Endet bald":"Se termine bientôt","Keine passenden Treffer":"Aucun résultat","Zum Inhalt springen":"Aller au contenu","Zurück":"Retour","Alle Shops":"Toutes les boutiques","Produkt oder Marke":"Produit ou marque"},
    es: {"Angebote":"Ofertas","Alle Angebote":"Todas las ofertas","Shops":"Tiendas","Shops & Händler":"Tiendas y vendedores","Kategorien":"Categorías","Suche":"Búsqueda","Suchen":"Buscar","Merkliste":"Favoritos","Konto":"Cuenta","Startseite":"Inicio","Start":"Inicio","Mehr erfahren":"Más información","Mehr anzeigen":"Mostrar más","Filter":"Filtros","Sortieren":"Ordenar","Aktuell":"Recientes","Preis aufsteigend":"Precio ascendente","Größter Rabatt":"Mayor descuento","Endet bald":"Termina pronto","Keine passenden Treffer":"Sin resultados","Zum Inhalt springen":"Saltar al contenido","Zurück":"Volver","Alle Shops":"Todas las tiendas","Produkt oder Marke":"Producto o marca"},
    ja: {"Angebote":"セール","Alle Angebote":"すべてのセール","Shops":"ショップ","Shops & Händler":"ショップ・販売店","Kategorien":"カテゴリー","Suche":"検索","Suchen":"検索","Merkliste":"お気に入り","Konto":"アカウント","Startseite":"ホーム","Start":"ホーム","Mehr erfahren":"詳細を見る","Mehr anzeigen":"もっと見る","Filter":"絞り込み","Sortieren":"並べ替え","Aktuell":"新着順","Preis aufsteigend":"価格の安い順","Größter Rabatt":"割引率順","Endet bald":"終了間近","Keine passenden Treffer":"該当する結果がありません","Zum Inhalt springen":"コンテンツへ移動","Zurück":"戻る","Alle Shops":"すべてのショップ","Produkt oder Marke":"商品またはブランド"},
    ru: {"Angebote":"Предложения","Alle Angebote":"Все предложения","Shops":"Магазины","Shops & Händler":"Магазины и продавцы","Kategorien":"Категории","Suche":"Поиск","Suchen":"Найти","Merkliste":"Избранное","Konto":"Аккаунт","Startseite":"Главная","Start":"Главная","Mehr erfahren":"Подробнее","Mehr anzeigen":"Показать ещё","Filter":"Фильтры","Sortieren":"Сортировка","Aktuell":"Новые","Preis aufsteigend":"По возрастанию цены","Größter Rabatt":"Максимальная скидка","Endet bald":"Скоро завершится","Keine passenden Treffer":"Ничего не найдено","Zum Inhalt springen":"Перейти к содержимому","Zurück":"Назад","Alle Shops":"Все магазины","Produkt oder Marke":"Товар или бренд"}
  };
  const codes = ["de","en","fr","es","ja","ru"];
  const names = {de:"Deutsch",en:"English",fr:"Français",es:"Español",ja:"日本語",ru:"Русский"};
  const key = "angebotslotse-language-v1";
  const stored = (() => { try {return localStorage.getItem(key);} catch {return null;} })();
  let language = codes.includes(stored) ? stored : "de";
  const originals = new WeakMap();
  const skip = "script,style,pre,code,textarea,[contenteditable],.deal-card,.product-card,[data-search],.deal-grid,.product-title,.product-name";
  function translate() {
    document.documentElement.lang = language;
    const map = dictionaries[language] || {};
    const nodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = nodes.nextNode())) {
      if (!node.parentElement || node.parentElement.closest(skip)) continue;
      const original = originals.get(node) ?? node.nodeValue;
      if (!original || !original.trim()) continue;
      const trim = original.trim();
      if (!originals.has(node)) originals.set(node, original);
      const replacement = map[trim];
      const next = replacement ? original.replace(trim,replacement) : original;
      if (node.nodeValue !== next) node.nodeValue = next;
    }
    for (const element of document.querySelectorAll("input[placeholder],button[aria-label]")) {
      const name = element.hasAttribute("placeholder") ? "placeholder" : "aria-label";
      if (!element.dataset.i18nOriginal) element.dataset.i18nOriginal = element.getAttribute(name) || "";
      const source = element.dataset.i18nOriginal;
      element.setAttribute(name,map[source] || source);
    }
    const picker = document.querySelector("#angebotslotse-language");
    if (picker) picker.value = language;
  }
  function init() {
    const wrap = document.createElement("label");
    wrap.className = "language-picker";
    wrap.setAttribute("aria-label","Website-Sprache auswählen");
    const select = document.createElement("select");
    select.id = "angebotslotse-language";
    select.setAttribute("aria-label","Language / Sprache");
    for (const code of codes) {
      const option=document.createElement("option");option.value=code;option.textContent=names[code];select.append(option);
    }
    select.value=language;
    select.addEventListener("change", () => {
      language=select.value;
      try {localStorage.setItem(key,language);} catch {}
      translate();
    });
    wrap.append(select);
    const place=document.querySelector("header nav") || document.querySelector("header") || document.body;
    place.append(wrap);
    const style=document.createElement("style");
    style.textContent=".language-picker{display:inline-flex;align-items:center;margin:.3rem;z-index:12}.language-picker select{max-width:138px;min-height:38px;padding:6px 26px 6px 8px;border-radius:8px;border:1px solid var(--border,#888);background:var(--surface,#fff);color:var(--text,#111);font:inherit;font-size:13px}.language-picker select:focus-visible{outline:3px solid #f39b36;outline-offset:2px}";
    document.head.append(style);
    translate();
  }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();
