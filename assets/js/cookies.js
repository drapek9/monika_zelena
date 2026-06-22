/**
 * Cookie lišta a správa souhlasu
 * Nastavení: assets/js/cookies-config.js → COOKIES
 */

function getStoredConsent() {
  try {
    const raw = localStorage.getItem(COOKIES.storageKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== COOKIES.version) return null;
    return data;
  } catch {
    return null;
  }
}

function saveConsent(analytics) {
  const data = {
    version: COOKIES.version,
    essential: true,
    analytics: Boolean(analytics),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(COOKIES.storageKey, JSON.stringify(data));
  applyConsent(data);
  hideCookieBanner();
  updateConsentPanel();
  document.dispatchEvent(new CustomEvent("mz:cookie-consent", { detail: data }));
}

function applyConsent(consent) {
  if (consent?.analytics && COOKIES.analytics?.googleAnalyticsId) {
    loadGoogleAnalytics(COOKIES.analytics.googleAnalyticsId);
  }
}

function loadGoogleAnalytics(measurementId) {
  if (window.__mzGaLoaded || !measurementId) return;
  window.__mzGaLoaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", measurementId, { anonymize_ip: true });
}

function renderCookieBanner() {
  if (document.getElementById("cookie-banner")) return;

  const banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Nastavení cookies");
  banner.setAttribute("aria-live", "polite");
  banner.innerHTML = `
    <div class="cookie-banner__inner container">
      <div class="cookie-banner__text">
        <p class="cookie-banner__title">Cookies a ochrana soukromí</p>
        <p class="cookie-banner__desc">
          Používáme nezbytné cookies pro správné fungování webu a ukládání vaší volby.
          Po souhlasu můžeme používat i analytické cookies pro měření návštěvnosti.
          Více v <a href="cookies.html">zásadách cookies</a> a
          <a href="ochrana-osobnich-udaju.html">ochraně osobních údajů</a>.
        </p>
      </div>
      <div class="cookie-banner__actions">
        <button type="button" class="btn btn--outline-dark btn--sm" data-cookie-reject>Nepovinné odmítnout</button>
        <button type="button" class="btn btn--primary btn--sm" data-cookie-accept>Přijmout vše</button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add("is-visible"));

  banner.querySelector("[data-cookie-accept]")?.addEventListener("click", () => saveConsent(true));
  banner.querySelector("[data-cookie-reject]")?.addEventListener("click", () => saveConsent(false));
}

function hideCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  if (!banner) return;
  banner.classList.remove("is-visible");
  setTimeout(() => banner.remove(), 350);
}

function updateConsentPanel() {
  const panel = document.getElementById("cookie-consent-panel");
  if (!panel) return;

  const consent = getStoredConsent();
  const statusEl = panel.querySelector("[data-consent-status]");
  if (statusEl) {
    if (!consent) {
      statusEl.textContent = "Zatím jste nevyjádřili souhlas s cookies.";
    } else if (consent.analytics) {
      statusEl.textContent = "Máte povoleny nezbytné i analytické cookies.";
    } else {
      statusEl.textContent = "Máte povoleny pouze nezbytné cookies.";
    }
  }
}

function initCookieConsentPanel() {
  const panel = document.getElementById("cookie-consent-panel");
  if (!panel) return;

  panel.querySelector("[data-cookie-accept]")?.addEventListener("click", () => saveConsent(true));
  panel.querySelector("[data-cookie-reject]")?.addEventListener("click", () => saveConsent(false));
  updateConsentPanel();
}

function initCookieConsent() {
  const consent = getStoredConsent();
  if (consent) {
    applyConsent(consent);
  } else {
    renderCookieBanner();
  }

  initCookieConsentPanel();

  window.MZCookieConsent = {
    acceptAll: () => saveConsent(true),
    rejectOptional: () => saveConsent(false),
    getConsent: getStoredConsent,
    showBanner: renderCookieBanner,
  };
}
