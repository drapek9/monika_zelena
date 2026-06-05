/**
 * Monika Zelená - vanilla JS: navigace, reveal, statistiky, nemovitosti, formulář, slider, lightbox
 */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getCurrentPagePath() {
  return (window.location.pathname.split("/").pop() || "index.html").split("?")[0];
}

/** Odkaz vede na aktuální stránku (bez reloadu). */
function hrefTargetsCurrentPage(href) {
  if (!href) return false;
  const raw = href.trim();
  if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return false;
  const linkPath = raw.split("?")[0].split("#")[0].trim() || "index.html";
  const pagePath = getCurrentPagePath();
  if (linkPath === pagePath) return true;
  const onHome = pagePath === "" || pagePath === "index.html";
  const linkHome =
    linkPath === "" ||
    linkPath === "index.html" ||
    linkPath === "./index.html" ||
    linkPath === "/" ||
    /(^|\/)index\.html$/i.test(linkPath);
  return onHome && linkHome;
}

function scrollPageToTop() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  if (window.location.hash && window.history.replaceState) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

/* ----- Loader ----- */
function initLoader() {
  const el = document.getElementById("page-loader");
  if (!el) return;
  window.addEventListener("load", () => {
    el.classList.add("is-done");
    setTimeout(() => el.remove(), 700);
  });
}

/* ----- Header scroll + mobile nav ----- */
function initHeader() {
  const header = document.getElementById("site-header");
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const path = getCurrentPagePath();
  document.querySelectorAll(".nav-list a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("is-active");
    }
    a.addEventListener("click", (e) => {
      const linkHref = (a.getAttribute("href") || "").trim();
      if (!hrefTargetsCurrentPage(linkHref)) return;
      e.preventDefault();
      scrollPageToTop();
    });
  });

  const logo = header?.querySelector(".logo");
  if (logo) {
    logo.addEventListener("click", (e) => {
      const href = (logo.getAttribute("href") || "").trim();
      if (!hrefTargetsCurrentPage(href)) return;
      e.preventDefault();
      scrollPageToTop();
    });
  }
}

/* ----- Inject partials (vyžaduje lokální server) ----- */
async function loadPartial(id, url) {
  const mount = document.getElementById(id);
  if (!mount) return;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);
    mount.innerHTML = await res.text();
    if (id === "header-mount") initHeader();
    if (id === "footer-mount") {
      const y = document.getElementById("year");
      if (y) y.textContent = String(new Date().getFullYear());
    }
  } catch {
    console.warn("Nepodařilo se načíst partial:", url, "- použijte lokální server (např. npx serve).");
  }
}

/* ----- Footer sociální sítě (DOM API - innerHTML + dlouhé SVG v některých prohlížečích usekne uzly) ----- */
async function initFooterSocialLinks() {
  const row = document.getElementById("footer-social-row");
  if (!row) return;
  try {
    const res = await fetch("data/footer-social.json", { cache: "no-store" });
    if (!res.ok) return;
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return;

    row.replaceChildren();
    const svgNS = "http://www.w3.org/2000/svg";
    for (const item of list) {
      if (!item.href || !item.label || !item.path) continue;
      const a = document.createElement("a");
      a.href = item.href;
      a.className = "social-icon";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", item.label);

      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "social-icon__svg");
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("width", "22");
      svg.setAttribute("height", "22");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("aria-hidden", "true");

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", item.path);

      svg.appendChild(path);
      a.appendChild(svg);
      row.appendChild(a);
    }
  } catch {
    /* nechat kontejner prázdný */
  }
}

/* ----- Scroll reveal ----- */
function initReveal() {
  if (prefersReducedMotion) {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const els = document.querySelectorAll("[data-reveal]");
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  els.forEach((el) => io.observe(el));
}

/* ----- Count-up stats ----- */
function animateValue(el, end, suffix = "", duration = 1600) {
  const start = 0;
  const startTime = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = Math.round(start + (end - start) * eased);
    el.textContent = current.toLocaleString("cs-CZ") + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function initStats() {
  const statNums = document.querySelectorAll("[data-count]");
  if (!statNums.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const raw = el.getAttribute("data-count");
        const suffix = el.getAttribute("data-suffix") || "";
        const end = parseFloat(raw);
        if (prefersReducedMotion) {
          el.textContent = end.toLocaleString("cs-CZ") + suffix;
        } else {
          animateValue(el, end, suffix);
        }
        io.unobserve(el);
      });
    },
    { threshold: 0.4 }
  );
  statNums.forEach((el) => io.observe(el));
}

/* ----- Properties (Supabase) ----- */
let _supabaseClient = null;
let _propertiesCatalogPromise = null;

async function getSupabase() {
  if (_supabaseClient) return _supabaseClient;
  const { createClient } = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"
  );
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("./supabase-config.js");
  _supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabaseClient;
}

function mapPropertyFromDb(row) {
  const isRent = row.type === "rent";
  const link = String(row.link || "").trim();
  let externalUrl = "";
  if (/^https?:\/\//i.test(link)) {
    externalUrl = link;
  } else if (row.id) {
    externalUrl = `nemovitost-detail.html?id=${encodeURIComponent(row.id)}`;
  }

  return {
    id: row.id,
    title: row.name,
    location: row.location,
    price: row.price == null || row.price === "" ? null : Number(row.price),
    priceKind: isRent ? "pronajem" : "prodej",
    type: row.type,
    image: row.image,
    gallery: row.image ? [row.image] : [],
    video: "",
    description: "",
    mapQuery: row.location,
    externalUrl,
    status: normalizePropertyStatus(row),
    sold: normalizePropertyStatus(row) === "sold",
  };
}

function normalizePropertyStatus(row) {
  if (row.status === "active" || row.status === "reserved" || row.status === "sold") {
    return row.status;
  }
  if (row.sold === true) return "sold";
  return "active";
}

async function fetchPropertiesCatalog() {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const all = (data || []).map(mapPropertyFromDb);
  return {
    all,
    active: all.filter((p) => p.status === "active" || p.status === "reserved"),
    sold: all.filter((p) => p.status === "sold"),
  };
}

function getPropertiesCatalog() {
  if (!_propertiesCatalogPromise) {
    _propertiesCatalogPromise = fetchPropertiesCatalog();
  }
  return _propertiesCatalogPromise;
}

async function fetchPropertyById(id) {
  if (!id) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPropertyFromDb(data) : null;
}

function propertiesLoadErrorHtml() {
  return `<p role="alert">Nemovitosti se nepodařilo načíst. Zkuste obnovit stránku.</p>`;
}

const PROPERTIES_EMPTY = {
  active: "Aktuálně žádné nabízené nemovitosti.",
  sold: "Aktuálně žádné ukázkové prodané nemovitosti.",
};

function propertiesEmptyHtml(kind) {
  const isSold = kind === "sold";
  const text = isSold ? PROPERTIES_EMPTY.sold : PROPERTIES_EMPTY.active;
  return `<div class="properties-empty-wrap">
    <p class="lead properties-empty${isSold ? " properties-empty--sold" : ""}">${text}</p>
  </div>`;
}

function formatPrice(n) {
  return (
    new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(n) + " Kč"
  );
}

function hasPropertyPrice(p) {
  return p.price != null && p.price !== "" && !Number.isNaN(Number(p.price));
}

/** Cena na kartě a detailu – prodáno / pronajato / neznámá / částka */
function formatPropertyPrice(p) {
  if (p.status === "sold") {
    return p.type === "rent" || p.priceKind === "pronajem" ? "Pronajato" : "Prodáno";
  }

  if (!hasPropertyPrice(p)) {
    return "Neznámá";
  }

  const num = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(p.price);
  if (p.priceKind === "pronajem") {
    return `${num} Kč/měsíc`;
  }
  return `${num} Kč`;
}

function getPropertyOfferButtonLabel(p) {
  return p.type === "rent" || p.priceKind === "pronajem" ? "Pronájem" : "Prodej";
}

function renderPropertyCard(p, { soldView = false } = {}) {
  const typeAttr = p.type ? ` data-type="${p.type}"` : "";
  const isSold = soldView || p.status === "sold";
  const soldClass = isSold ? " property-card--sold" : "";
  let badge = "";
  if (isSold) {
    const badgeLabel =
      p.type === "rent" || p.priceKind === "pronajem" ? "Pronajato" : "Prodáno";
    badge = `<span class="sold-badge">${badgeLabel}</span>`;
  } else if (p.status === "reserved") {
    badge = `<span class="sold-badge sold-badge--reserved">Rezervováno</span>`;
  }

  const detailUrl = !isSold && p.externalUrl ? String(p.externalUrl).trim() : "";
  const opensNewTab = detailUrl && /^https?:\/\//i.test(detailUrl);
  const targetAttrs = opensNewTab ? ' target="_blank" rel="noopener noreferrer"' : "";

  let actionHtml = "";
  if (detailUrl) {
    const offerLabel = getPropertyOfferButtonLabel(p);
    actionHtml = `
          <div class="property-card__actions">
            <a href="${detailUrl}" class="btn btn--primary btn--sm"${targetAttrs}>${offerLabel}</a>
          </div>`;
  }

  const cardLink = detailUrl
    ? `<a class="property-card__link" href="${detailUrl}"${targetAttrs} aria-label="Detail nemovitosti: ${p.title}"></a>`
    : "";

  return `
      <article class="property-card${soldClass}"${typeAttr}>
        <div class="property-card__media">
          ${badge}
          <img src="${p.image}" alt="" loading="lazy" width="600" height="450" />
        </div>
        <div class="property-card__body">
          <div class="property-card__content">
            <p class="eyebrow">${p.location}</p>
            <h3>${p.title}</h3>
            <p class="property-card__price">${formatPropertyPrice(p)}</p>
          </div>
          ${actionHtml}
        </div>
        ${cardLink}
      </article>`;
}

async function loadPropertiesList(containerSelector, options = {}) {
  const root = document.querySelector(containerSelector);
  if (!root) return [];
  try {
    const { active } = await getPropertiesCatalog();
    const limit = options.limit;
    const items = typeof limit === "number" ? active.slice(0, limit) : active;
    root.innerHTML = items.length
      ? items.map((p) => renderPropertyCard(p)).join("")
      : propertiesEmptyHtml("active");
    return active;
  } catch (e) {
    console.error("Properties load error:", e);
    root.innerHTML = propertiesLoadErrorHtml();
    return [];
  }
}

function renderPropertyGrid(root, items, { soldView = false } = {}) {
  root.innerHTML = items.map((p) => renderPropertyCard(p, { soldView })).join("");
}

async function initPropertiesPage() {
  const root = document.getElementById("property-grid-page");
  if (!root) return;

  const buttons = document.querySelectorAll("[data-property-view]");
  if (!buttons.length) return;

  let properties = [];
  let sold = [];

  try {
    const catalog = await getPropertiesCatalog();
    properties = catalog.active;
    sold = catalog.sold;
  } catch (e) {
    console.error("Properties page load error:", e);
    root.innerHTML = propertiesLoadErrorHtml();
    return;
  }

  const setView = (view) => {
    const isSold = view === "prodano";
    const items = isSold ? sold : properties;
    if (!items.length) {
      root.innerHTML = propertiesEmptyHtml(isSold ? "sold" : "active");
    } else {
      renderPropertyGrid(root, items, { soldView: isSold });
    }
    buttons.forEach((b) =>
      b.classList.toggle("is-active", b.getAttribute("data-property-view") === view)
    );
  };

  setView("aktualni");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.getAttribute("data-property-view")));
  });
}

/* ----- Sold (Supabase) ----- */
async function loadSold(selector) {
  const root = document.querySelector(selector);
  if (!root) return;
  try {
    const { sold } = await getPropertiesCatalog();
    root.innerHTML = sold.length
      ? sold.map((s) => renderPropertyCard(s, { soldView: true })).join("")
      : propertiesEmptyHtml("sold");
  } catch (e) {
    console.error("Sold properties load error:", e);
    root.innerHTML = "";
  }
}

/* ----- Projects (Supabase) ----- */
let _projectsPromise = null;

function mapProjectFromDb(row) {
  const link = String(row.link || "").trim();
  return {
    id: row.id,
    title: row.name,
    location: row.location,
    summary: row.description || "",
    image: row.image,
    externalUrl: link || "https://hvreality.cz/",
  };
}

async function fetchProjects() {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapProjectFromDb);
}

function getProjects() {
  if (!_projectsPromise) {
    _projectsPromise = fetchProjects();
  }
  return _projectsPromise;
}

/** Počet projektů v hero statistikách (úvodní stránka). */
async function syncDevProjectsStatCount() {
  const el = document.querySelector('[data-stat="dev-projects"]');
  if (!el) return;
  try {
    const projects = await getProjects();
    el.setAttribute("data-count", String(projects.length));
  } catch (e) {
    console.error("Dev projects stat load error:", e);
  }
}

function projectsEmptyHtml() {
  return `<div class="dev-empty-wrap">
    <p class="lead dev-empty">Aktuálně žádné developerské projekty.</p>
  </div>`;
}

function renderDevCard(p) {
  const webUrl =
    p.externalUrl && String(p.externalUrl).trim().length
      ? String(p.externalUrl).trim()
      : "https://hvreality.cz/";
  return `
      <article class="dev-card">
        <div class="dev-card__media">
          <img src="${p.image}" alt="" loading="lazy" />
        </div>
        <div class="dev-card__body">
          <p class="eyebrow" style="margin-bottom:0.5rem">${p.location}</p>
          <h3>${p.title}</h3>
          <p style="color:rgba(255,255,255,.72);font-size:0.92rem">${p.summary}</p>
          <div style="margin-top:1.25rem">
            <a href="${webUrl}" class="btn btn--primary btn--sm" target="_blank" rel="noopener noreferrer">Web projektu</a>
          </div>
        </div>
      </article>`;
}

async function loadProjects(selector, limit) {
  const root = document.querySelector(selector);
  if (!root) return;
  try {
    let list = await getProjects();
    if (limit) list = list.slice(0, limit);
    root.innerHTML = list.length
      ? list.map((p) => renderDevCard(p)).join("")
      : projectsEmptyHtml();
  } catch (e) {
    console.error("Projects load error:", e);
    root.innerHTML = `<p role="alert">Projekty se nepodařilo načíst.</p>`;
  }
}

/* ----- Services icons (inline SVG) ----- */
const icons = {
  home: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>`,
  rent: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l8 7v9H4V11l8-7z"/></svg>`,
  key: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8" cy="15" r="4"/><path d="M15 8l2 2m3-5l-5 5"/></svg>`,
  chart: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19h16"/><path d="M7 16V9m5 7V5m5 11v-4"/></svg>`,
  dollar: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  bank: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 10h16v10H4V10zm2-4h12v4H6V6z"/><path d="M12 14v4"/></svg>`,
  sofa: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 12V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 14v3h4v2h10v-2h4v-3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/></svg>`,
  film: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14"/></svg>`,
  drone: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 8l4-4m8 0l4 4m0 8l-4 4m-8 0l-4-4"/><circle cx="12" cy="12" r="3"/></svg>`,
  scale: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2"/></svg>`,
  building: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10.5 16h3"/></svg>`
};

async function loadServices(selector, limit) {
  const root = document.querySelector(selector);
  if (!root) return;
  try {
    const res = await fetch("data/services.json");
    let list = await res.json();
    if (limit) list = list.slice(0, limit);
    root.innerHTML = list
      .map(
        (s) => `
      <article class="service-card">
        <div class="service-card__icon" aria-hidden="true">${icons[s.icon] || icons.home}</div>
        <h3>${s.title}</h3>
        <p>${s.short}</p>
      </article>`
      )
      .join("");
  } catch {
    root.innerHTML = "";
  }
}

/* ----- Nekonečný horizontální karusel (reference, nemovitosti na domů) -----
   Duplicitní řada v DOM; po scrollIndex === N stejný výřez jako 0 → okamžitý přeskok. */
function setCarouselNavVisible(prev, next, visible) {
  [prev, next].forEach((btn) => {
    if (!btn) return;
    btn.hidden = !visible;
    btn.setAttribute("aria-hidden", visible ? "false" : "true");
  });
}

function initInfiniteCarousel({
  viewport,
  track,
  prev,
  next,
  items,
  cardSelector,
  minItemsToLoop = null,
  autoplayMs = 0,
  getVisibleCount = null,
}) {
  if (!track || !viewport || !items?.length) return;

  const N = items.length;
  let scrollIndex = 0;
  let autoplayTimer = null;

  function visibleCount() {
    if (typeof getVisibleCount === "function") return getVisibleCount();
    const w = window.innerWidth;
    if (w < 640) return 1;
    if (w < 960) return 2;
    return 3;
  }

  function canInfinite() {
    if (typeof minItemsToLoop === "number") return N > minItemsToLoop;
    return N > visibleCount();
  }

  function applyTransform(stepPx, instant) {
    if (instant) track.style.transition = "none";
    track.style.transform = `translateX(-${scrollIndex * stepPx}px)`;
    if (instant) {
      void track.offsetHeight;
      track.style.removeProperty("transition");
    }
  }

  function layout(opts = {}) {
    const vc = visibleCount();
    const gapPx = parseFloat(getComputedStyle(track).gap) || 0;
    const vw = viewport.clientWidth;
    const cardW = vc > 0 ? (vw - (vc - 1) * gapPx) / vc : vw;

    track.querySelectorAll(cardSelector).forEach((el) => {
      el.style.flex = `0 0 ${cardW}px`;
    });

    const step = cardW + gapPx;

    if (!canInfinite()) {
      scrollIndex = 0;
      applyTransform(step, true);
      setCarouselNavVisible(prev, next, false);
      stopTimer();
      return;
    }

    scrollIndex = Math.min(scrollIndex, N);
    applyTransform(step, opts.instant === true);
    setCarouselNavVisible(prev, next, true);
    if (prev) prev.disabled = false;
    if (next) next.disabled = false;
  }

  function snapAfterLoop(step) {
    if (scrollIndex !== N) return;
    scrollIndex = 0;
    applyTransform(step, true);
  }

  function onTrackTransitionEnd(e) {
    if (e.propertyName !== "transform" || e.target !== track) return;
    const gapPx = parseFloat(getComputedStyle(track).gap) || 0;
    const vw = viewport.clientWidth;
    const vc = visibleCount();
    const cardW = vc > 0 ? (vw - (vc - 1) * gapPx) / vc : vw;
    snapAfterLoop(cardW + gapPx);
  }

  track.addEventListener("transitionend", onTrackTransitionEnd);

  function go(delta) {
    if (!canInfinite()) return;
    const gapPx = parseFloat(getComputedStyle(track).gap) || 0;
    const vw = viewport.clientWidth;
    const vc = visibleCount();
    const cardW = vc > 0 ? (vw - (vc - 1) * gapPx) / vc : vw;
    const step = cardW + gapPx;

    if (prefersReducedMotion) {
      if (delta > 0) {
        scrollIndex += 1;
        if (scrollIndex >= N) scrollIndex = 0;
      } else if (scrollIndex > 0) {
        scrollIndex -= 1;
      } else {
        scrollIndex = N - 1;
      }
      layout({ instant: true });
      return;
    }

    if (delta > 0) {
      if (scrollIndex < N) {
        scrollIndex += 1;
        layout();
      }
      return;
    }

    if (scrollIndex > 0) {
      scrollIndex -= 1;
      layout();
      return;
    }

    track.style.transition = "none";
    scrollIndex = N;
    applyTransform(step, true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.removeProperty("transition");
        scrollIndex = N - 1;
        layout();
      });
    });
  }

  function stopTimer() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function startTimer() {
    stopTimer();
    if (!autoplayMs || prefersReducedMotion || !canInfinite()) return;
    autoplayTimer = window.setInterval(() => go(1), autoplayMs);
  }

  function restartAutoplayAfterManualNav() {
    stopTimer();
    startTimer();
  }

  const onPrevClick = () => {
    go(-1);
    restartAutoplayAfterManualNav();
  };
  const onNextClick = () => {
    go(1);
    restartAutoplayAfterManualNav();
  };

  prev?.addEventListener("click", onPrevClick);
  next?.addEventListener("click", onNextClick);

  const ro = new ResizeObserver(() => layout({ instant: true }));
  ro.observe(viewport);
  requestAnimationFrame(() => layout());
  startTimer();
  track.addEventListener("mouseenter", stopTimer);
  track.addEventListener("mouseleave", startTimer);

  return {
    relayout: () => layout({ instant: true }),
    destroy: () => {
      stopTimer();
      ro.disconnect();
      track.removeEventListener("transitionend", onTrackTransitionEnd);
      track.removeEventListener("mouseenter", stopTimer);
      track.removeEventListener("mouseleave", startTimer);
      prev?.removeEventListener("click", onPrevClick);
      next?.removeEventListener("click", onNextClick);
    },
  };
}

function scheduleCarouselRelayoutOnReveal(sliderWrap, relayout) {
  if (!sliderWrap || typeof relayout !== "function") return;
  if (sliderWrap.classList.contains("is-visible")) {
    relayout();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        relayout();
        io.disconnect();
      }
    },
    { threshold: 0.05 }
  );
  io.observe(sliderWrap);
}

function initPresentationVideosCarousel() {
  const sliderWrap = document.getElementById("presentation-videos-slider");
  const viewport = document.getElementById("presentation-videos-viewport");
  const track = document.getElementById("presentation-videos-track");
  const prev = document.getElementById("presentation-v-prev");
  const next = document.getElementById("presentation-v-next");
  if (!viewport || !track) return;

  const items = [...track.querySelectorAll(".presentation-video")];
  if (items.length < 2) return;

  track.innerHTML = buildInfiniteTrackHtml(items, (el) => el.outerHTML, true);
  void viewport.offsetWidth;

  const carousel = initInfiniteCarousel({
    viewport,
    track,
    prev,
    next,
    items,
    cardSelector: ".presentation-video",
    minItemsToLoop: 2,
    getVisibleCount: () => (window.innerWidth < 540 ? 1 : 2),
  });

  if (carousel && sliderWrap) {
    const relayout = () => carousel.relayout();
    requestAnimationFrame(() => requestAnimationFrame(relayout));
    scheduleCarouselRelayoutOnReveal(sliderWrap, relayout);
  }
}

function buildInfiniteTrackHtml(items, renderItem, duplicate) {
  const cardHtml = items.map((item) => renderItem(item)).join("");
  return duplicate && items.length >= 2 ? cardHtml + cardHtml : cardHtml;
}

async function loadTestimonials(options = {}) {
  const viewport = document.getElementById(options.viewportId || "testimonial-viewport");
  const track = document.getElementById(options.trackId || "testimonial-track");
  const prev = document.getElementById(options.prevId || "t-prev");
  const next = document.getElementById(options.nextId || "t-next");
  if (!track || !viewport) return;

  try {
    const res = await fetch("data/testimonials.json");
    const list = await res.json();
    track.innerHTML = buildInfiniteTrackHtml(
      list,
      (t) => `
      <article class="testimonial-card">
        <p class="testimonial-card__quote">„${t.quote}“</p>
        <p class="testimonial-card__author">${t.name}</p>
      </article>`,
      true
    );
    initInfiniteCarousel({
      viewport,
      track,
      prev,
      next,
      items: list,
      cardSelector: ".testimonial-card",
      autoplayMs: 4000,
    });
  } catch {
    track.innerHTML = "";
  }
}

const HOME_CAROUSEL_MOBILE_BP = 640;

function isHomeCarouselMobile() {
  return window.innerWidth < HOME_CAROUSEL_MOBILE_BP;
}

/** Mobil: karusel při 2+ položkách; desktop: při 4+ (jako dřív). */
function shouldUseHomeCarousel(itemCount) {
  if (itemCount <= 0) return false;
  return isHomeCarouselMobile() ? itemCount > 1 : itemCount > 3;
}

function homeCarouselMinItemsToLoop() {
  return isHomeCarouselMobile() ? 1 : 3;
}

function initHomeCarouselSection({
  grid,
  sliderWrap,
  viewport,
  track,
  prev,
  next,
  items,
  renderItem,
  cardSelector,
  emptyHtml,
  errorHtml,
  logLabel,
}) {
  if (!grid) return;

  let activeCarousel = null;
  let layoutMode = null;

  function destroyActiveCarousel() {
    activeCarousel?.destroy?.();
    activeCarousel = null;
  }

  function resetTrack() {
    if (!track) return;
    track.innerHTML = "";
    track.style.removeProperty("transform");
    track.style.removeProperty("transition");
  }

  function showGrid(html) {
    destroyActiveCarousel();
    if (sliderWrap) sliderWrap.hidden = true;
    setCarouselNavVisible(prev, next, false);
    resetTrack();
    grid.hidden = false;
    grid.innerHTML = html;
    layoutMode = "grid";
  }

  function showCarousel() {
    if (!sliderWrap || !track || !viewport) {
      showGrid(items.map((item) => renderItem(item)).join(""));
      return;
    }

    destroyActiveCarousel();
    sliderWrap.hidden = false;
    setCarouselNavVisible(prev, next, true);
    grid.hidden = true;
    track.innerHTML = buildInfiniteTrackHtml(items, renderItem, true);
    track.style.removeProperty("transform");
    void viewport.offsetWidth;

    activeCarousel = initInfiniteCarousel({
      viewport,
      track,
      prev,
      next,
      items,
      cardSelector,
      minItemsToLoop: homeCarouselMinItemsToLoop(),
      autoplayMs: 0,
    });

    if (activeCarousel) {
      const relayout = () => activeCarousel.relayout();
      requestAnimationFrame(() => requestAnimationFrame(relayout));
      scheduleCarouselRelayoutOnReveal(sliderWrap, relayout);
    }
    layoutMode = "carousel";
  }

  function render() {
    try {
      if (!items.length) {
        destroyActiveCarousel();
        if (sliderWrap) sliderWrap.hidden = true;
        setCarouselNavVisible(prev, next, false);
        resetTrack();
        grid.hidden = false;
        grid.innerHTML = emptyHtml;
        layoutMode = "empty";
        return;
      }

      if (shouldUseHomeCarousel(items.length)) {
        if (layoutMode === "carousel" && activeCarousel) {
          activeCarousel.relayout();
          return;
        }
        showCarousel();
        return;
      }

      if (layoutMode === "grid") return;
      showGrid(items.map((item) => renderItem(item)).join(""));
    } catch (e) {
      console.error(`${logLabel} home load error:`, e);
      destroyActiveCarousel();
      if (sliderWrap) sliderWrap.hidden = true;
      setCarouselNavVisible(prev, next, false);
      resetTrack();
      grid.hidden = false;
      grid.innerHTML = errorHtml;
      layoutMode = "error";
    }
  }

  render();

  let resizeTimer;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const wantCarousel = shouldUseHomeCarousel(items.length);
        const haveCarousel = layoutMode === "carousel";
        if (wantCarousel === haveCarousel) {
          if (haveCarousel && activeCarousel) activeCarousel.relayout();
          return;
        }
        render();
      }, 120);
    },
    { passive: true }
  );
}

async function loadHomePropertiesSection() {
  const grid = document.getElementById("property-grid-home");
  if (!grid) return;

  try {
    const { active } = await getPropertiesCatalog();
    initHomeCarouselSection({
      grid,
      sliderWrap: document.getElementById("property-home-slider-wrap"),
      viewport: document.getElementById("property-home-viewport"),
      track: document.getElementById("property-home-track"),
      prev: document.getElementById("property-home-prev"),
      next: document.getElementById("property-home-next"),
      items: active,
      renderItem: (p) => renderPropertyCard(p),
      cardSelector: ".property-card",
      emptyHtml: propertiesEmptyHtml("active"),
      errorHtml: propertiesLoadErrorHtml(),
      logLabel: "Properties",
    });
  } catch (e) {
    console.error("Properties home load error:", e);
    grid.innerHTML = propertiesLoadErrorHtml();
  }
}

async function loadHomeSoldSection() {
  const grid = document.getElementById("sold-grid-home");
  if (!grid) return;

  try {
    const { sold } = await getPropertiesCatalog();
    initHomeCarouselSection({
      grid,
      sliderWrap: document.getElementById("sold-home-slider-wrap"),
      viewport: document.getElementById("sold-home-viewport"),
      track: document.getElementById("sold-home-track"),
      prev: document.getElementById("sold-home-prev"),
      next: document.getElementById("sold-home-next"),
      items: sold,
      renderItem: (s) => renderPropertyCard(s, { soldView: true }),
      cardSelector: ".property-card",
      emptyHtml: propertiesEmptyHtml("sold"),
      errorHtml: "",
      logLabel: "Sold properties",
    });
  } catch (e) {
    console.error("Sold properties home load error:", e);
    grid.innerHTML = "";
  }
}

async function loadHomeDevSection() {
  const grid = document.getElementById("dev-grid-home");
  if (!grid) return;

  try {
    const projects = await getProjects();
    initHomeCarouselSection({
      grid,
      sliderWrap: document.getElementById("dev-home-slider-wrap"),
      viewport: document.getElementById("dev-home-viewport"),
      track: document.getElementById("dev-home-track"),
      prev: document.getElementById("dev-home-prev"),
      next: document.getElementById("dev-home-next"),
      items: projects,
      renderItem: (p) => renderDevCard(p),
      cardSelector: ".dev-card",
      emptyHtml: projectsEmptyHtml(),
      errorHtml: `<p role="alert">Projekty se nepodařilo načíst.</p>`,
      logLabel: "Projects",
    });
  } catch (e) {
    console.error("Projects home load error:", e);
    grid.innerHTML = `<p role="alert">Projekty se nepodařilo načíst.</p>`;
  }
}

/* ----- Sociální videa - posuv po stránkách (jako janhlavon.cz) ----- */
function initSocialVideosCarousel() {
  const viewport = document.getElementById("social-videos-viewport");
  const prevBtn = document.getElementById("social-v-prev");
  const nextBtn = document.getElementById("social-v-next");
  if (!viewport) return;

  const row = viewport.querySelector(".social-videos-row");
  if (!row) return;

  const getVideos = () => [...row.querySelectorAll("video")];

  /** Umožní dojet na konec tak, že poslední video zůstane vlevo (jako janhlavon.cz). */
  function syncEndPadding() {
    const videos = getVideos();
    if (!videos.length) {
      row.style.removeProperty("padding-right");
      return;
    }
    const last = videos[videos.length - 1];
    const pad = Math.max(0, viewport.clientWidth - last.offsetWidth);
    row.style.paddingRight = `${pad}px`;
  }

  function maxScrollLeft() {
    return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  }

  /** Index posledního videa celého viditelného při daném scrollLeft. */
  function lastFullyVisibleIndex(scrollLeft) {
    const videos = getVideos();
    const vw = viewport.clientWidth;
    const eps = 2;
    let last = -1;

    for (let i = 0; i < videos.length; i++) {
      const relLeft = videos[i].offsetLeft - scrollLeft;
      const relRight = relLeft + videos[i].offsetWidth;
      if (relLeft < -eps) continue;
      if (relRight <= vw + eps) last = i;
      else break;
    }

    return last;
  }

  /**
   * Každá stránka = offsetLeft videa zarovnaného vlevo (levé video vždy celé),
   * na konci maxScrollLeft (poslední video vlevo).
   */
  function getPageScrollTargets() {
    const videos = getVideos();
    const maxSL = maxScrollLeft();
    if (!videos.length) return [0];
    if (maxSL <= 0) return [0];

    const targets = [0];
    let scrollLeft = 0;
    const eps = 6;

    while (scrollLeft < maxSL - eps) {
      const last = lastFullyVisibleIndex(scrollLeft);

      if (last < 0) {
        if (maxSL > scrollLeft + eps && targets[targets.length - 1] !== maxSL) {
          targets.push(maxSL);
        }
        break;
      }

      const nextIdx = last + 1;
      if (nextIdx >= videos.length) break;

      if (nextIdx >= videos.length - 1) {
        if (targets[targets.length - 1] !== maxSL) targets.push(maxSL);
        break;
      }

      const nextLeft = videos[nextIdx].offsetLeft;
      if (nextLeft <= scrollLeft + eps) break;

      targets.push(nextLeft);
      scrollLeft = nextLeft;
    }

    if (targets[targets.length - 1] !== maxSL) {
      targets.push(maxSL);
    }

    return targets;
  }

  function anchorPage() {
    const targets = getPageScrollTargets();
    const sl = viewport.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < targets.length; i++) {
      const dist = Math.abs(sl - targets[i]);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function scrollToPage(page) {
    const targets = getPageScrollTargets();
    if (!targets.length) return;
    const left = Math.round(
      targets[Math.min(targets.length - 1, Math.max(0, page))]
    );
    viewport.scrollTo({ left, behavior: "auto" });
  }

  function isAtStart() {
    return viewport.scrollLeft <= 6;
  }

  function isAtEnd() {
    const eps = 6;
    const { clientWidth, scrollWidth } = viewport;
    const targets = getPageScrollTargets();
    if (scrollWidth <= clientWidth + eps) return true;
    if (targets.length <= 1) return true;
    return viewport.scrollLeft >= targets[targets.length - 1] - eps;
  }

  function go(delta) {
    if (delta < 0 && isAtStart()) return;
    if (delta > 0 && isAtEnd()) return;
    const targets = getPageScrollTargets();
    if (!targets.length) return;
    const page = anchorPage();
    scrollToPage(Math.min(targets.length - 1, Math.max(0, page + delta)));
  }

  prevBtn?.addEventListener("click", () => go(-1));
  nextBtn?.addEventListener("click", () => go(1));

  function snapToNearestPage() {
    const targets = getPageScrollTargets();
    const page = anchorPage();
    const target = targets[page];
    if (target == null) return;
    if (Math.abs(viewport.scrollLeft - target) > 2) {
      viewport.scrollTo({ left: Math.round(target), behavior: "auto" });
    }
  }

  viewport.addEventListener("scrollend", snapToNearestPage);

  const ro = new ResizeObserver(() => {
    syncEndPadding();
    scrollToPage(anchorPage());
  });
  ro.observe(viewport);

  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  });

  getVideos().forEach((v) => {
    v.addEventListener("loadedmetadata", () => {
      syncEndPadding();
      scrollToPage(anchorPage());
    });
  });
  syncEndPadding();
}

/* ----- Video lightbox ----- */
function initVideoLightbox() {
  const triggers = document.querySelectorAll("[data-video-open]");
  const lb = document.getElementById("video-lightbox");
  const video = document.getElementById("lightbox-video");
  const closeBtn = document.getElementById("lightbox-close");

  if (!lb || !video) return;

  function open(src) {
    video.src = src;
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    video.play?.().catch(() => {});
    document.body.style.overflow = "hidden";
  }

  function close() {
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    video.pause?.();
    video.removeAttribute("src");
    document.body.style.overflow = "";
  }

  triggers.forEach((el) => {
    el.addEventListener("click", () => {
      const src = el.getAttribute("data-video-src");
      if (src) open(src);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const src = el.getAttribute("data-video-src");
      if (src) open(src);
    });
  });

  closeBtn?.addEventListener("click", close);
  lb.addEventListener("click", (e) => {
    if (e.target === lb) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

/* ----- Lead form wizard ----- */
function initLeadForm() {
  const formRoot = document.getElementById("lead-wizard");
  if (!formRoot) return;

  const steps = [...formRoot.querySelectorAll(".lead-step")];
  const progressBar = document.getElementById("lead-progress-bar");
  let step = 0;

  const data = {
    type: "",
    city: "",
    street: "",
    ownerRole: "",
    condition: "",
    name: "",
    email: "",
    phone: "",
    message: "",
    consent: false
  };

  function setStep(i) {
    step = Math.max(0, Math.min(i, steps.length - 1));
    steps.forEach((s, idx) => s.classList.toggle("is-active", idx === step));
    if (progressBar) {
      progressBar.style.width = `${((step + 1) / steps.length) * 100}%`;
    }
    const feedback = document.getElementById("lead-feedback");
    if (feedback) {
      feedback.innerHTML =
        step === steps.length - 1
          ? `<strong>Téměř hotovo.</strong> Zkontrolujte údaje a odešlete zprávu.`
          : `Krok <strong>${step + 1}</strong> ze ${steps.length}`;
    }
  }

  formRoot.querySelectorAll("[data-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      formRoot.querySelectorAll("[data-choice]").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      data.type = btn.getAttribute("data-choice") || "";
      setTimeout(() => setStep(1), 280);
    });
  });

  document.getElementById("lead-next-1")?.addEventListener("click", () => {
    const cityInp = document.getElementById("lead-city");
    const streetInp = document.getElementById("lead-street");
    data.city = cityInp?.value.trim() || "";
    data.street = streetInp?.value.trim() || "";
    if (data.city.length < 2) {
      cityInp?.focus();
      return;
    }
    if (data.street.length < 2) {
      streetInp?.focus();
      return;
    }
    setStep(2);
  });

  document.getElementById("lead-next-owner")?.addEventListener("click", () => {
    const sel = formRoot.querySelector('input[name="lead-owner-role"]:checked');
    data.ownerRole = sel?.value || "";
    if (!data.ownerRole) return;
    setStep(3);
  });

  document.getElementById("lead-next-2")?.addEventListener("click", () => {
    const sel = formRoot.querySelector('input[name="condition"]:checked');
    data.condition = sel?.value || "";
    if (!data.condition) return;
    setStep(4);
  });

  formRoot.querySelectorAll(".lead-back").forEach((btn) => {
    btn.addEventListener("click", () => setStep(step - 1));
  });

  document.getElementById("lead-submit")?.addEventListener("click", (e) => {
    e.preventDefault();
    data.name = document.getElementById("lead-name")?.value.trim() || "";
    data.email = document.getElementById("lead-email")?.value.trim() || "";
    data.phone = document.getElementById("lead-phone")?.value.trim() || "";
    data.message = document.getElementById("lead-message")?.value.trim() || "";
    data.consent = document.getElementById("lead-consent")?.checked === true;

    if (data.name.length < 2) {
      document.getElementById("lead-name")?.focus();
      return;
    }
    if (!data.email.includes("@")) {
      document.getElementById("lead-email")?.focus();
      return;
    }
    const phoneDigits = data.phone.replace(/\D/g, "");
    if (phoneDigits.length < 9) {
      document.getElementById("lead-phone")?.focus();
      return;
    }
    if (!data.consent) {
      document.getElementById("lead-consent")?.focus();
      return;
    }

    const summary = document.getElementById("lead-summary");
    if (summary) {
      summary.innerHTML = `
        <p><strong>Typ:</strong> ${data.type}</p>
        <p><strong>Adresa:</strong> ${data.street ? `${data.street}, ` : ""}${data.city}</p>
        <p><strong>Vlastník:</strong> ${data.ownerRole}</p>
        <p><strong>Stav:</strong> ${data.condition}</p>
        <p><strong>Kontakt:</strong> ${data.name}, ${data.email}, ${data.phone}</p>
        ${data.message ? `<p><strong>Zpráva:</strong> ${data.message}</p>` : ""}
        <p class="mt-sm" style="opacity:.75">V produkční verzi by data odešla na server / CRM. Nyní jen náhled.</p>`;
    }
    const fd = document.getElementById("lead-feedback");
    if (fd) fd.innerHTML = `<strong>Děkuji.</strong> Ozvu se co nejdříve s návrhem dalšího postupu.`;
  });

  setStep(0);
}

/* ----- Odhad zdarma wizard ----- */
function renderEstimateWizardHtml() {
  const dispositions = [
    "1+kk",
    "1+1",
    "2+kk",
    "2+1",
    "3+kk",
    "3+1",
    "4+kk",
    "4+1",
    "5+kk",
    "5+1",
    "Nevím"
  ];
  const dispositionOptions = dispositions
    .map((d) => `<option value="${d}">${d}</option>`)
    .join("");

  return `
    <div style="max-width: 560px">
      <p class="eyebrow">Odhad zdarma</p>
      <h1>Odhad ceny nemovitosti</h1>
      <p class="lead">Pět krátkých kroků – bez zbytečných polí. Ozvu se s nezávazným odhadem a návrhem dalšího postupu.</p>
    </div>
    <div class="lead-panel mt-md" id="estimate-wizard">
      <div class="lead-stepper" role="presentation" aria-hidden="true">
        <div class="lead-stepper__item" style="flex: 1; height: 4px; background: rgba(255, 255, 255, 0.15); border-radius: 999px; overflow: hidden">
          <div id="estimate-progress-bar" style="height: 100%; width: 20%; background: var(--c-accent); transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1)"></div>
        </div>
      </div>
      <p class="lead-feedback" id="estimate-feedback">Krok <strong>1</strong> ze 5</p>
      <div class="lead-steps">
        <div class="lead-step is-active">
          <h3>Typ nemovitosti</h3>
          <div class="choice-grid">
            <button type="button" class="choice-btn" data-estimate-choice="byt">Byt</button>
            <button type="button" class="choice-btn" data-estimate-choice="dům">Dům</button>
            <button type="button" class="choice-btn" data-estimate-choice="pozemek">Pozemek</button>
            <button type="button" class="choice-btn" data-estimate-choice="komerční prostor">Komerční prostor</button>
          </div>
        </div>
        <div class="lead-step">
          <h3>Kde se nemovitost nachází?</h3>
          <label class="visually-hidden" for="estimate-city">Město</label>
          <input class="lead-input" id="estimate-city" type="text" placeholder="Město" autocomplete="address-level2" />
          <label class="visually-hidden" for="estimate-street">Ulice</label>
          <input class="lead-input" id="estimate-street" type="text" placeholder="Ulice" autocomplete="street-address" />
          <div class="lead-actions">
            <button type="button" class="btn btn--ghost" id="estimate-next-1">Pokračovat</button>
            <button type="button" class="btn btn--outline-dark estimate-back" style="border-color: rgba(255,255,255,.35); color: #fff">Zpět</button>
          </div>
        </div>
        <div class="lead-step">
          <h3>Jste vlastníkem nemovitosti?</h3>
          <div class="lead-radio-list">
            <label><input type="radio" name="estimate-owner-role" value="Ano" /> Ano</label>
            <label><input type="radio" name="estimate-owner-role" value="Ne, zastupuji vlastníka" /> Ne, zastupuji vlastníka</label>
            <label><input type="radio" name="estimate-owner-role" value="Spoluvlastník" /> Spoluvlastník</label>
          </div>
          <div class="lead-actions">
            <button type="button" class="btn btn--ghost" id="estimate-next-owner">Pokračovat</button>
            <button type="button" class="btn btn--outline-dark estimate-back" style="border-color: rgba(255,255,255,.35); color: #fff">Zpět</button>
          </div>
        </div>
        <div class="lead-step">
          <h3>Parametry nemovitosti</h3>
          <label class="visually-hidden" for="estimate-disposition">Dispozice</label>
          <select class="lead-select" id="estimate-disposition" required>
            <option value="" disabled selected>Dispozice</option>
            ${dispositionOptions}
          </select>
          <label class="visually-hidden" for="estimate-area">Plocha v m²</label>
          <input class="lead-input" id="estimate-area" type="number" min="1" step="1" placeholder="Plocha (m²)" inputmode="numeric" />
          <p style="margin: 0 0 0.75rem; font-size: 0.88rem; color: rgba(255,255,255,.65)">Druh vlastnictví</p>
          <div class="lead-radio-list">
            <label><input type="radio" name="estimate-ownership" value="Osobní vlastnictví" /> Osobní vlastnictví</label>
            <label><input type="radio" name="estimate-ownership" value="Družstevní vlastnictví" /> Družstevní vlastnictví</label>
            <label><input type="radio" name="estimate-ownership" value="Jiné" /> Jiné</label>
            <label><input type="radio" name="estimate-ownership" value="Nevím" /> Nevím</label>
          </div>
          <div class="lead-actions">
            <button type="button" class="btn btn--ghost" id="estimate-next-2">Pokračovat</button>
            <button type="button" class="btn btn--outline-dark estimate-back" style="border-color: rgba(255,255,255,.35); color: #fff">Zpět</button>
          </div>
        </div>
        <div class="lead-step">
          <h3>Kontakt a zpráva</h3>
          <label class="visually-hidden" for="estimate-name">Jméno a příjmení</label>
          <input class="lead-input" id="estimate-name" type="text" placeholder="Jméno a příjmení" autocomplete="name" />
          <label class="visually-hidden" for="estimate-email">E-mail</label>
          <input class="lead-input" id="estimate-email" type="email" placeholder="E-mail" autocomplete="email" />
          <label class="visually-hidden" for="estimate-phone">Telefon</label>
          <input class="lead-input" id="estimate-phone" type="tel" placeholder="Telefon" autocomplete="tel" />
          <label class="visually-hidden" for="estimate-message">Zpráva</label>
          <textarea class="lead-input" id="estimate-message" rows="4" placeholder="Zpráva (volitelné)" style="resize: vertical; min-height: 110px"></textarea>
          <label class="lead-consent">
            <input type="checkbox" id="estimate-consent" />
            <span>Souhlasím se zpracováním osobních údajů za účelem nezávazného odhadu nemovitosti.</span>
          </label>
          <div class="lead-actions">
            <button type="button" class="btn btn--primary" id="estimate-submit">Odeslat nezávazně</button>
            <button type="button" class="btn btn--ghost estimate-back">Zpět</button>
          </div>
          <div id="estimate-summary" class="lead-feedback" style="margin-top: 1.25rem"></div>
        </div>
      </div>
    </div>`;
}

function initEstimateForm() {
  const formRoot = document.getElementById("estimate-wizard");
  if (!formRoot) return;

  const steps = [...formRoot.querySelectorAll(".lead-step")];
  const progressBar = document.getElementById("estimate-progress-bar");
  let step = 0;

  const data = {
    type: "",
    city: "",
    street: "",
    ownerRole: "",
    disposition: "",
    area: "",
    ownership: "",
    name: "",
    email: "",
    phone: "",
    message: "",
    consent: false
  };

  function setStep(i) {
    step = Math.max(0, Math.min(i, steps.length - 1));
    steps.forEach((s, idx) => s.classList.toggle("is-active", idx === step));
    if (progressBar) {
      progressBar.style.width = `${((step + 1) / steps.length) * 100}%`;
    }
    const feedback = document.getElementById("estimate-feedback");
    if (feedback) {
      feedback.innerHTML =
        step === steps.length - 1
          ? `<strong>Téměř hotovo.</strong> Zkontrolujte údaje a odešlete žádost o odhad.`
          : `Krok <strong>${step + 1}</strong> ze ${steps.length}`;
    }
  }

  formRoot.querySelectorAll("[data-estimate-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      formRoot.querySelectorAll("[data-estimate-choice]").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      data.type = btn.getAttribute("data-estimate-choice") || "";
      setTimeout(() => setStep(1), 280);
    });
  });

  document.getElementById("estimate-next-1")?.addEventListener("click", () => {
    const cityInp = document.getElementById("estimate-city");
    const streetInp = document.getElementById("estimate-street");
    data.city = cityInp?.value.trim() || "";
    data.street = streetInp?.value.trim() || "";
    if (data.city.length < 2) {
      cityInp?.focus();
      return;
    }
    if (data.street.length < 2) {
      streetInp?.focus();
      return;
    }
    setStep(2);
  });

  document.getElementById("estimate-next-owner")?.addEventListener("click", () => {
    const sel = formRoot.querySelector('input[name="estimate-owner-role"]:checked');
    data.ownerRole = sel?.value || "";
    if (!data.ownerRole) return;
    setStep(3);
  });

  document.getElementById("estimate-next-2")?.addEventListener("click", () => {
    const dispositionEl = document.getElementById("estimate-disposition");
    const areaEl = document.getElementById("estimate-area");
    const ownershipSel = formRoot.querySelector('input[name="estimate-ownership"]:checked');

    data.disposition = dispositionEl?.value || "";
    data.area = areaEl?.value.trim() || "";
    data.ownership = ownershipSel?.value || "";

    if (!data.disposition) {
      dispositionEl?.focus();
      return;
    }
    const areaNum = Number(data.area);
    if (!data.area || Number.isNaN(areaNum) || areaNum < 1) {
      areaEl?.focus();
      return;
    }
    if (!data.ownership) return;
    setStep(4);
  });

  formRoot.querySelectorAll(".estimate-back").forEach((btn) => {
    btn.addEventListener("click", () => setStep(step - 1));
  });

  document.getElementById("estimate-submit")?.addEventListener("click", (e) => {
    e.preventDefault();
    data.name = document.getElementById("estimate-name")?.value.trim() || "";
    data.email = document.getElementById("estimate-email")?.value.trim() || "";
    data.phone = document.getElementById("estimate-phone")?.value.trim() || "";
    data.message = document.getElementById("estimate-message")?.value.trim() || "";
    data.consent = document.getElementById("estimate-consent")?.checked === true;

    if (data.name.length < 2) {
      document.getElementById("estimate-name")?.focus();
      return;
    }
    if (!data.email.includes("@")) {
      document.getElementById("estimate-email")?.focus();
      return;
    }
    const phoneDigits = data.phone.replace(/\D/g, "");
    if (phoneDigits.length < 9) {
      document.getElementById("estimate-phone")?.focus();
      return;
    }
    if (!data.consent) {
      document.getElementById("estimate-consent")?.focus();
      return;
    }

    const summary = document.getElementById("estimate-summary");
    if (summary) {
      summary.innerHTML = `
        <p><strong>Typ:</strong> ${data.type}</p>
        <p><strong>Adresa:</strong> ${data.street ? `${data.street}, ` : ""}${data.city}</p>
        <p><strong>Vlastník:</strong> ${data.ownerRole}</p>
        <p><strong>Dispozice:</strong> ${data.disposition} · <strong>Plocha:</strong> ${data.area} m²</p>
        <p><strong>Druh vlastnictví:</strong> ${data.ownership}</p>
        <p><strong>Kontakt:</strong> ${data.name}, ${data.email}, ${data.phone}</p>
        ${data.message ? `<p><strong>Zpráva:</strong> ${data.message}</p>` : ""}
        <p class="mt-sm" style="opacity:.75">V produkční verzi by data odešla na server / CRM. Nyní jen náhled.</p>`;
    }
    const feedback = document.getElementById("estimate-feedback");
    if (feedback) {
      feedback.innerHTML = `<strong>Děkuji.</strong> Ozvu se co nejdříve s nezávazným odhadem.`;
    }
  });

  setStep(0);
}

/* ----- Parallax subtle ----- */
function initParallax() {
  if (prefersReducedMotion) return;
  const els = document.querySelectorAll("[data-parallax]");
  if (!els.length) return;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      els.forEach((el) => {
        const speed = parseFloat(el.getAttribute("data-parallax") || "0.08");
        el.style.transform = `translateY(${y * speed}px)`;
      });
    },
    { passive: true }
  );
}

/* Kotva na úvodní stránce (např. index.html#lead z Reference) */
function initIndexHashScrollPrep() {
  const path = (window.location.pathname.split("/").pop() || "index.html").split("?")[0];
  if (path !== "index.html" && path !== "") return;
  if (!window.location.hash) return;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
}

function scrollToHashTarget() {
  const hash = window.location.hash;
  if (!hash) return;
  const el = document.getElementById(hash.slice(1));
  if (!el) return;

  el.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("is-visible"));

  const header = document.getElementById("site-header");
  const offset = (header?.offsetHeight ?? 76) + 20;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    });
  });
}

/* Stránka Odhad zdarma – světlá hlavička jako Domů, bez skoku na hash */
function initEstimatePageShell() {
  const path = (window.location.pathname.split("/").pop() || "index.html").split("?")[0];
  const params = new URLSearchParams(window.location.search);
  if (path !== "sluzba-detail.html" || params.get("slug") !== "odhad") return;

  document.body.classList.add("has-light-hero");
  if (window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.scrollTo(0, 0);
}

/* ----- Boot ----- */
async function boot() {
  initLoader();
  initIndexHashScrollPrep();
  initEstimatePageShell();
  await loadPartial("header-mount", "partials/header.html");
  await loadPartial("footer-mount", "partials/footer.html");
  await initFooterSocialLinks();

  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  initReveal();
  initVideoLightbox();
  initLeadForm();
  initParallax();

  const path = (window.location.pathname.split("/").pop() || "index.html").split("?")[0];

  if (path === "index.html" || path === "") {
    await syncDevProjectsStatCount();
  }

  initStats();

  if (path === "index.html" || path === "") {
    await loadHomePropertiesSection();
    await loadHomeSoldSection();
    await loadHomeDevSection();
    await loadServices("#services-grid-home", 4);
    await loadTestimonials();
    initPresentationVideosCarousel();
    initSocialVideosCarousel();
    if (window.location.hash) scrollToHashTarget();
  }

  if (path === "nemovitosti.html") {
    await initPropertiesPage();
  }

  if (path === "nemovitost-detail.html") {
    await initPropertyDetail();
  }

  if (path === "developerske-projekty.html") {
    await loadProjects("#dev-grid-full");
  }

  if (path === "sluzby.html") {
    await loadServices("#services-grid-full");
  }

  if (path === "reference.html") {
    await loadReferencePage();
  }

  if (path === "o-mne.html") {
    await loadTestimonials({
      viewportId: "about-testimonial-viewport",
      trackId: "about-testimonial-track",
      prevId: "about-t-prev",
      nextId: "about-t-next"
    });
  }

  if (path === "sluzba-detail.html") {
    await initServiceDetail();
  }
}

async function initPropertyDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const titleEl = document.getElementById("detail-title");
  const galleryMain = document.getElementById("gallery-main-img");
  const thumbs = document.getElementById("gallery-thumbs");
  const desc = document.getElementById("detail-desc");
  const priceEl = document.getElementById("detail-price");
  const locEl = document.getElementById("detail-loc");
  const videoBtn = document.getElementById("detail-video-btn");

  try {
    const p = (await fetchPropertyById(id)) || (await getPropertiesCatalog()).active[0];
    if (!p) {
      if (titleEl) titleEl.textContent = "Nemovitost nenalezena";
      return;
    }
    document.title = `${p.title} | Monika Zelená`;
    if (titleEl) titleEl.textContent = p.title;
    if (priceEl) priceEl.textContent = formatPropertyPrice(p);
    if (locEl) locEl.textContent = p.location;

    const hvLink = document.getElementById("detail-hv-link");
    if (hvLink) {
      if (p.externalUrl) {
        hvLink.href = p.externalUrl;
        hvLink.hidden = false;
      } else {
        hvLink.hidden = true;
      }
    }
    if (desc) desc.textContent = p.description;

    const imgs = p.gallery?.length ? p.gallery : [p.image];
    if (galleryMain) galleryMain.src = imgs[0];
    if (thumbs) {
      thumbs.innerHTML = imgs
        .map(
          (src, i) =>
            `<button type="button" class="${i === 0 ? "is-active" : ""}" data-img="${src}" aria-label="Zobrazit fotografii ${i + 1}">
          <img src="${src}" alt="" width="120" height="80" loading="lazy" />
        </button>`
        )
        .join("");
      thumbs.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          thumbs.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          if (galleryMain) galleryMain.src = btn.getAttribute("data-img") || "";
        });
      });
    }

    if (p.video && videoBtn) {
      videoBtn.hidden = false;
      videoBtn.addEventListener("click", () => {
        const lb = document.getElementById("video-lightbox");
        const video = document.getElementById("lightbox-video");
        if (lb && video) {
          video.src = p.video;
          lb.classList.add("is-open");
          video.play?.().catch(() => {});
        }
      });
    }
    const mapIframe = document.querySelector(".map-embed iframe");
    if (mapIframe && p.mapQuery) {
      mapIframe.src = `https://www.google.com/maps?q=${encodeURIComponent(p.mapQuery)}&output=embed`;
    }
  } catch {
    if (titleEl) titleEl.textContent = "Nemovitost nenalezena";
  }
}

async function loadReferencePage() {
  const grid = document.getElementById("reference-grid");
  if (!grid) return;
  try {
    const res = await fetch("data/testimonials.json");
    const testimonials = await res.json();
    grid.innerHTML = testimonials
      .map(
        (t) => `
      <article class="testimonial-card">
        <p class="testimonial-card__quote">„${t.quote}“</p>
        <p class="testimonial-card__author">${t.name}</p>
      </article>`
      )
      .join("");
  } catch {
    grid.innerHTML = "";
  }
}

async function initServiceDetail() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || "prodej";
  const root = document.getElementById("service-detail");
  try {
    const res = await fetch("data/services.json");
    const list = await res.json();
    const s = list.find((x) => x.slug === slug) || list[0];
    if (!root || !s) return;
    document.title = `${s.title} | Monika Zelená`;

    if (s.slug === "odhad") {
      document.body.classList.add("has-light-hero");
      root.classList.add("is-wide");
      root.innerHTML = renderEstimateWizardHtml();
      initEstimateForm();
      window.scrollTo(0, 0);
      return;
    }

    root.classList.remove("is-wide");
    root.innerHTML = `
      <p class="eyebrow">Služba</p>
      <h1>${s.title}</h1>
      <p class="lead">${s.short}</p>
      <p>Individuální strategie pro Jihlavu a Vysočinu - od první konzultace po předání klíčů. Kombinuji zkušenosti z financí s moderním marketingem a prémiovou prezentací nemovitosti.</p>
      <ul style="margin-top:1.5rem;padding-left:1.2rem;color:var(--c-muted)">
        <li>Transparentní komunikace a férové nastavení očekávání</li>
        <li>Profesionální foto, video a případně dronové záběry</li>
        <li>Databáze zájemců a práce se sociálními sítěmi</li>
        <li>Právní a finanční koordinace přes ověřené partnery</li>
      </ul>
      <p class="mt-md"><a class="btn btn--outline-dark" href="kontakt.html">Domluvit konzultaci</a></p>`;
  } catch {
    if (root) root.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  boot();
});
