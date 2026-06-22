import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATES,
} from "./emailjs-config.js";

const PLACEHOLDER_RE = /^YOUR_/;

function isPlaceholder(value) {
  return !value || PLACEHOLDER_RE.test(String(value).trim());
}

/** Vrátí true, pokud je pro daný formulář vyplněná konfigurace EmailJS. */
export function isEmailJsConfigured(formKey) {
  if (isPlaceholder(EMAILJS_PUBLIC_KEY) || isPlaceholder(EMAILJS_SERVICE_ID)) {
    return false;
  }
  const templateId = EMAILJS_TEMPLATES[formKey];
  return Boolean(templateId) && !isPlaceholder(templateId);
}

let _emailjs = null;
let _initialized = false;

async function getEmailJs() {
  if (_emailjs) return _emailjs;

  const mod = await import("https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm");
  _emailjs = mod.default ?? mod;

  if (!_initialized && !isPlaceholder(EMAILJS_PUBLIC_KEY)) {
    _emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    _initialized = true;
  }

  return _emailjs;
}

/**
 * Odešle e-mail přes EmailJS.
 * @param {"contact"|"lead"|"estimate"} formKey
 * @param {Record<string, string>} templateParams
 * @returns {Promise<{ ok: boolean, notConfigured?: boolean, error?: string }>}
 */
export async function sendFormEmail(formKey, templateParams) {
  if (!isEmailJsConfigured(formKey)) {
    console.warn(
      `[EmailJS] Formulář "${formKey}" není nakonfigurován. Vyplňte hodnoty v assets/js/emailjs-config.js`
    );
    return { ok: false, notConfigured: true };
  }

  try {
    const emailjs = await getEmailJs();
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATES[formKey], {
      ...templateParams,
      submitted_at: new Date().toLocaleString("cs-CZ"),
      page_url: window.location.href,
    });
    return { ok: true };
  } catch (err) {
    console.error("[EmailJS] Odeslání selhalo:", err);
    return {
      ok: false,
      error: err?.text || err?.message || "Nepodařilo se odeslat zprávu.",
    };
  }
}
