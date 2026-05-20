/**
 * Monika Zelená - vanilla JS: navigace, reveal, statistiky, nemovitosti, formulář, slider, lightbox
 */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  const path = (window.location.pathname.split("/").pop() || "index.html").split("?")[0];
  document.querySelectorAll(".nav-list a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("is-active");
    }
  });

  const logo = header?.querySelector(".logo");
  if (logo) {
    logo.addEventListener("click", (e) => {
      const href = (logo.getAttribute("href") || "").trim();
      const goesHome =
        href === "index.html" ||
        href === "/" ||
        href === "./index.html" ||
        /(^|\/)index\.html$/i.test(href);
      const onHome = path === "" || path === "index.html";
      if (!onHome || !goesHome) return;
      e.preventDefault();
      if (toggle && nav) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
      if (window.location.hash && window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
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

/* ----- Properties fetch & filter ----- */
function formatPrice(n) {
  return (
    new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(n) + " Kč"
  );
}

/** Cena na kartě a detailu - prodej (Kč) vs pronájem (Kč/měsíc) */
function formatPropertyPrice(p) {
  const num = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(p.price);
  if (p.priceKind === "pronajem") {
    return `${num} Kč/měsíc`;
  }
  return `${num} Kč`;
}

function renderPropertyCard(p, { sold = false } = {}) {
  const typeAttr = p.type ? ` data-type="${p.type}"` : "";
  const soldClass = sold ? " property-card--sold" : "";
  const badge = sold ? `<span class="sold-badge">Prodáno</span>` : "";
  const externalUrl = !sold && p.externalUrl ? String(p.externalUrl).trim() : "";
  const link = externalUrl
    ? `<a class="property-card__link" href="${externalUrl}" target="_blank" rel="noopener noreferrer" aria-label="Detail nemovitosti: ${p.title}"></a>`
    : "";

  return `
      <article class="property-card${soldClass}"${typeAttr}>
        <div class="property-card__media">
          ${badge}
          <img src="${p.image}" alt="" loading="lazy" width="600" height="450" />
        </div>
        <div class="property-card__body">
          <p class="eyebrow">${p.location}</p>
          <h3>${p.title}</h3>
          <p class="property-card__price">${formatPropertyPrice(p)}</p>
        </div>
        ${link}
      </article>`;
}

async function loadPropertiesList(containerSelector, options = {}) {
  const root = document.querySelector(containerSelector);
  if (!root) return [];
  try {
    const res = await fetch("data/properties.json");
    const list = await res.json();
    const limit = options.limit;
    const items = typeof limit === "number" ? list.slice(0, limit) : list;
    root.innerHTML = items.map((p) => renderPropertyCard(p)).join("");
    return list;
  } catch (e) {
    root.innerHTML = `<p role="alert">Obsah se nepodařilo načíst. Spusťte web přes lokální server.</p>`;
    return [];
  }
}

function renderPropertyGrid(root, items, { sold = false } = {}) {
  root.innerHTML = items.map((p) => renderPropertyCard(p, { sold })).join("");
}

async function initPropertiesPage() {
  const root = document.getElementById("property-grid-page");
  if (!root) return;

  const buttons = document.querySelectorAll("[data-property-view]");
  if (!buttons.length) return;

  let properties = [];
  let sold = [];

  try {
    const [pRes, sRes] = await Promise.all([
      fetch("data/properties.json"),
      fetch("data/sold.json"),
    ]);
    properties = await pRes.json();
    sold = await sRes.json();
  } catch {
    root.innerHTML = `<p role="alert">Obsah se nepodařilo načíst. Spusťte web přes lokální server.</p>`;
    return;
  }

  const setView = (view) => {
    const isSold = view === "prodano";
    renderPropertyGrid(root, isSold ? sold : properties, { sold: isSold });
    buttons.forEach((b) =>
      b.classList.toggle("is-active", b.getAttribute("data-property-view") === view)
    );
  };

  setView("aktualni");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.getAttribute("data-property-view")));
  });
}

/* ----- Sold ----- */
async function loadSold(selector) {
  const root = document.querySelector(selector);
  if (!root) return;
  try {
    const res = await fetch("data/sold.json");
    const list = await res.json();
    root.innerHTML = list.map((s) => renderPropertyCard(s, { sold: true })).join("");
  } catch {
    root.innerHTML = "";
  }
}

/* ----- Projects ----- */
async function loadProjects(selector, limit) {
  const root = document.querySelector(selector);
  if (!root) return;
  try {
    const res = await fetch("data/projects.json");
    let list = await res.json();
    if (limit) list = list.slice(0, limit);
    root.innerHTML = list
      .map((p) => {
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
      })
      .join("");
  } catch {
    root.innerHTML = "";
  }
}

/* ----- Services icons (inline SVG) ----- */
const icons = {
  home: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>`,
  key: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8" cy="15" r="4"/><path d="M15 8l2 2m3-5l-5 5"/></svg>`,
  chart: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19h16"/><path d="M7 16V9m5 7V5m5 11v-4"/></svg>`,
  bank: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 10h16v10H4V10zm2-4h12v4H6V6z"/><path d="M12 14v4"/></svg>`,
  sofa: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 12V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 14v3h4v2h10v-2h4v-3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/></svg>`,
  film: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14"/></svg>`,
  drone: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 8l4-4m8 0l4 4m0 8l-4 4m-8 0l-4-4"/><circle cx="12" cy="12" r="3"/></svg>`,
  scale: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v18M5 7h14M8 12h8"/></svg>`,
  building: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2m4 0h2M9 11h2m4 0h2M9 15h4"/></svg>`
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

/* ----- Testimonials -----
   Nekonečný posuv ve stejném směru: duplicitní řada v DOM, po scrollIndex === N stejný výřez jako na 0 → okamžitý přeskok bez „zpětné“ animace. */
async function loadTestimonials(options = {}) {
  const viewportId = options.viewportId || "testimonial-viewport";
  const trackId = options.trackId || "testimonial-track";
  const prevId = options.prevId || "t-prev";
  const nextId = options.nextId || "t-next";

  const viewport = document.getElementById(viewportId);
  const track = document.getElementById(trackId);
  if (!track || !viewport) return;

  let scrollIndex = 0;
  let testimonialTimer = null;

  try {
    const res = await fetch("data/testimonials.json");
    const list = await res.json();
    const N = list.length;

    const cardHtml = list
      .map(
        (t) => `
      <article class="testimonial-card">
        <p class="testimonial-card__quote">„${t.quote}“</p>
        <p class="testimonial-card__author">${t.name}</p>
      </article>`
      )
      .join("");
    track.innerHTML = N >= 2 ? cardHtml + cardHtml : cardHtml;

    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);

    function visibleCount() {
      const w = window.innerWidth;
      if (w < 640) return 1;
      if (w < 960) return 2;
      return 3;
    }

    function canInfinite() {
      return N > visibleCount();
    }

    function applyTransform(stepPx, instant) {
      if (instant) {
        track.style.transition = "none";
      }
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

      track.querySelectorAll(".testimonial-card").forEach((el) => {
        el.style.flex = `0 0 ${cardW}px`;
      });

      const step = cardW + gapPx;

      if (!canInfinite()) {
        scrollIndex = 0;
        applyTransform(step, true);
        if (prev) prev.disabled = true;
        if (next) next.disabled = true;
        stopTimer();
        return;
      }

      scrollIndex = Math.min(scrollIndex, N);
      applyTransform(step, opts.instant === true);

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
      const step = cardW + gapPx;
      snapAfterLoop(step);
    }

    track.addEventListener("transitionend", onTrackTransitionEnd);

    function go(delta) {
      if (!canInfinite()) return;
      const vc = visibleCount();
      const gapPx = parseFloat(getComputedStyle(track).gap) || 0;
      const vw = viewport.clientWidth;
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

    function restartAutoplayAfterManualNav() {
      stopTimer();
      startTimer();
    }

    prev?.addEventListener("click", () => {
      go(-1);
      restartAutoplayAfterManualNav();
    });
    next?.addEventListener("click", () => {
      go(1);
      restartAutoplayAfterManualNav();
    });

    function stopTimer() {
      if (testimonialTimer) {
        clearInterval(testimonialTimer);
        testimonialTimer = null;
      }
    }

    function startTimer() {
      stopTimer();
      if (prefersReducedMotion || !canInfinite()) return;
      testimonialTimer = window.setInterval(() => {
        go(1);
      }, 4000);
    }

    const ro = new ResizeObserver(() => layout({ instant: true }));
    ro.observe(viewport);
    requestAnimationFrame(() => layout());

    startTimer();
    track.addEventListener("mouseenter", stopTimer);
    track.addEventListener("mouseleave", startTimer);
  } catch {
    track.innerHTML = "";
  }
}

/* ----- Sociální videa — jeden řádek, horizontální posuv ----- */
function initSocialVideosCarousel() {
  const viewport = document.getElementById("social-videos-viewport");
  const prevBtn = document.getElementById("social-v-prev");
  const nextBtn = document.getElementById("social-v-next");
  if (!viewport) return;

  const row = viewport.querySelector(".social-videos-row");
  if (!row) return;

  const getVideos = () => [...row.querySelectorAll("video")];

  function anchorIndex() {
    const videos = getVideos();
    if (!videos.length) return 0;
    const sl = viewport.scrollLeft;
    let idx = 0;
    for (let i = 0; i < videos.length; i++) {
      if (videos[i].offsetLeft <= sl + 8) idx = i;
    }
    return idx;
  }

  function scrollToIndex(i) {
    const videos = getVideos();
    const v = videos[i];
    if (!v) return;
    const maxSL = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const left = Math.min(Math.max(0, v.offsetLeft), maxSL);
    viewport.scrollTo({
      left,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  function updateNav() {
    const eps = 6;
    const { scrollLeft, clientWidth, scrollWidth } = viewport;
    const allFit = scrollWidth <= clientWidth + eps;
    const atStart = scrollLeft <= eps;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - eps;

    if (prevBtn) prevBtn.disabled = allFit || atStart;
    if (nextBtn) nextBtn.disabled = allFit || atEnd;
  }

  function go(delta) {
    const videos = getVideos();
    if (!videos.length) return;
    const i = anchorIndex();
    const target = Math.min(videos.length - 1, Math.max(0, i + delta));
    scrollToIndex(target);
  }

  prevBtn?.addEventListener("click", () => go(-1));
  nextBtn?.addEventListener("click", () => go(1));

  viewport.addEventListener("scroll", updateNav, { passive: true });
  const ro = new ResizeObserver(() => updateNav());
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
    v.addEventListener("loadedmetadata", updateNav, { once: true });
  });
  requestAnimationFrame(updateNav);
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
  initStats();
  initVideoLightbox();
  initLeadForm();
  initParallax();

  const path = (window.location.pathname.split("/").pop() || "index.html").split("?")[0];

  if (path === "index.html" || path === "") {
    await loadPropertiesList("#property-grid-home");
    await loadSold("#sold-grid-home");
    await loadProjects("#dev-grid-home", 3);
    await loadServices("#services-grid-home", 4);
    await loadTestimonials();
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
    const res = await fetch("data/properties.json");
    const list = await res.json();
    const p = list.find((x) => x.id === id) || list[0];
    if (!p) return;
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
