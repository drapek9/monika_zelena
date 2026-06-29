/**
 * EmailJS – veřejná konfigurace pro formuláře na webu.
 *
 * Nastavení v dashboardu EmailJS (https://dashboard.emailjs.com/):
 * 1. Email Services → vytvořte službu (Gmail, Outlook…) → zkopírujte Service ID
 * 2. Email Templates → stačí 2 šablony:
 *    - kontakt (contact)
 *    - nemovitost – sdílená pro prodej i odhad (lead + estimate)
 * 3. Account → API Keys → Public Key
 *
 * Šablona contact:
 *   {{from_name}}, {{reply_to}}, {{phone}}, {{message}}, {{form_label}}, {{page_url}}
 *
 * Šablona property (prodej + odhad):
 *   {{from_name}}, {{reply_to}}, {{phone}}, {{message}}, {{property_type}}, {{city}},
 *   {{street}}, {{owner_role}}, {{condition}}, {{disposition}}, {{area}}, {{ownership}},
 *   {{form_label}}, {{page_url}}
 *   (u prodeje jsou disposition/area/ownership „—“; u odhadu je condition „—“)
 *
 * Tip: v šabloně nastavte Reply-To na {{reply_to}}, aby šlo odpovědět přímo klientovi.
 */

/** Veřejný klíč z EmailJS (Account → API Keys). */
export const EMAILJS_PUBLIC_KEY = "bN5Y8oC1J4WPax-aN";

/** ID e-mailové služby (Email Services). */
export const EMAILJS_SERVICE_ID = "service_t9vaxmr";

/** ID šablon (Email Templates). lead a estimate sdílí jednu šablonu. */
export const EMAILJS_TEMPLATES = {
  contact: "template_eyc1wm2",
  lead: "template_cawi7i8",
  estimate: "template_cawi7i8",
};
