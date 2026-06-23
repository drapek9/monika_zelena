/**
 * SEO konfigurace webu – upravte SITE_ORIGIN po nasazení na produkční doménu.
 */
export const SITE_ORIGIN = "https://monikazelena.cz";

export const SEO_DEFAULTS = {
  siteName: "Monika Zelená",
  locale: "cs_CZ",
  themeColor: "#0a0a0a",
  defaultImage: "/images/fotka_ja.webp",
  defaultImageAlt: "Monika Zelená – realitní makléřka",
  author: "Monika Zelená",
  geoRegion: "CZ-VY",
  geoPlacename: "Jihlava",
};

export const BUSINESS = {
  name: "Monika Zelená",
  jobTitle: "Realitní makléřka",
  email: "zelena@hvreality.cz",
  telephone: "+420731984866",
  addressLocality: "Jihlava",
  addressRegion: "Kraj Vysočina",
  addressCountry: "CZ",
  areaServed: ["Jihlava", "Vysočina", "Česká republika"],
  image: "/images/fotka_ja.webp",
  sameAs: [
    "https://www.instagram.com/monika.zelena.reality",
    "https://www.facebook.com/943303708871973/",
    "https://www.tiktok.com/@zelena.monika",
    "https://hvreality.cz/",
  ],
  parentOrg: {
    name: "HV Reality",
    url: "https://hvreality.cz/",
  },
};

/** Statické stránky – title a description pro meta tagy. */
export const PAGES = {
  home: {
    path: "index.html",
    title: "Monika Zelená | Realitní makléřka Jihlava a Vysočina",
    description:
      "Monika Zelená – realitní makléřka pro Jihlavu a Vysočinu. Prodej a pronájem nemovitostí, odhad zdarma, videoprohlídky a férový proces. HV Reality.",
  },
  kontakt: {
    path: "kontakt.html",
    title: "Kontakt | Monika Zelená – realitní makléřka Jihlava",
    description:
      "Kontakt na realitní makléřku Moniku Zelenou. Jihlava a Vysočina. E-mail zelena@hvreality.cz, telefon +420 731 984 866. Ozvěte se nezávazně.",
  },
  nemovitosti: {
    path: "nemovitosti.html",
    title: "Nemovitosti na prodej a k pronájmu | Jihlava, Vysočina",
    description:
      "Aktuální nabídka nemovitostí na prodej a k pronájmu v Jihlavě, na Vysočině a okolí. Byty, domy a další reality s profesionální prezentací.",
  },
  "nemovitost-detail": {
    path: "nemovitost-detail.html",
    title: "Detail nemovitosti | Monika Zelená",
    description:
      "Detail nemovitosti – fotogalerie, popis, mapa a kontakt na realitní makléřku Moniku Zelenou. Jihlava, Vysočina.",
  },
  sluzby: {
    path: "sluzby.html",
    title: "Služby realitní makléřky | Prodej, pronájem, odhad",
    description:
      "Služby realitní makléřky Moniky Zelové: prodej a pronájem nemovitostí, odhad ceny zdarma, právní servis a developerské projekty na Vysočině.",
  },
  "sluzba-detail": {
    path: "sluzba-detail.html",
    title: "Služba | Monika Zelená – realitní makléřka",
    description:
      "Detail služby realitní makléřky Moniky Zelové. Prodej, pronájem, odhad nemovitosti a další služby pro Jihlavu a Vysočinu.",
  },
  "o-mne": {
    path: "o-mne.html",
    title: "O mně | Monika Zelená – realitní makléřka",
    description:
      "Monika Zelená – realitní makléřka pro Jihlavu a Vysočinu. Zkušenosti z financí, moderní prezentace nemovitostí a férový průběh transakce.",
  },
  reference: {
    path: "reference.html",
    title: "Reference klientů | Monika Zelená",
    description:
      "Reference a recenze klientů Moniky Zelové – prodej, pronájem a spolupráce na realitním trhu v Jihlavě a na Vysočině.",
  },
  "developerske-projekty": {
    path: "developerske-projekty.html",
    title: "Developerské projekty | Monika Zelená, Vysočina",
    description:
      "Developerské projekty na Vysočině a v okolí – prezentace, práce se zájemci a marketing. Monika Zelená, HV Reality.",
  },
  cookies: {
    path: "cookies.html",
    title: "Zásady cookies | Monika Zelená",
    description:
      "Informace o používání cookies na webu realitní makléřky Moniky Zelené – typy cookies, účel zpracování a správa souhlasu.",
  },
  "ochrana-osobnich-udaju": {
    path: "ochrana-osobnich-udaju.html",
    title: "Ochrana osobních údajů | Monika Zelená",
    description:
      "Zásady zpracování osobních údajů na webu realitní makléřky Moniky Zelené v souladu s GDPR.",
  },
};

export function absoluteUrl(path = "") {
  const clean = String(path).replace(/^\//, "");
  if (!clean || clean === "index.html") return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}/${clean}`;
}

export function absoluteAsset(path = "") {
  const clean = String(path).replace(/^\//, "");
  return `${SITE_ORIGIN}/${clean}`;
}
