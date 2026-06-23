import {
  SITE_ORIGIN,
  SEO_DEFAULTS,
  BUSINESS,
  PAGES,
  absoluteUrl,
  absoluteAsset,
} from "./seo-config.js";

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
}

function upsertLink(rel, href, extra = {}) {
  let el = document.head.querySelector(`link[rel="${rel}"]${extra.hreflang ? `[hreflang="${extra.hreflang}"]` : ""}`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  Object.entries(extra).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function upsertJsonLd(id, data) {
  let el = document.head.querySelector(`script[data-seo-jsonld="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-jsonld", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function applySeo({ title, description, url, image, imageAlt, type = "website", robots = "index, follow" }) {
  if (title) document.title = title;

  if (description) {
    upsertMeta('meta[name="description"]', { name: "description", content: description });
  }

  upsertMeta('meta[name="robots"]', { name: "robots", content: robots });

  if (url) {
    upsertLink("canonical", url);
    upsertLink("alternate", url, { hreflang: "cs-CZ" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
  }

  if (title) {
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
  }

  if (description) {
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
  }

  const ogImage = image || absoluteAsset(SEO_DEFAULTS.defaultImage);
  const ogImageAlt = imageAlt || SEO_DEFAULTS.defaultImageAlt;

  upsertMeta('meta[property="og:image"]', { property: "og:image", content: ogImage });
  upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: ogImageAlt });
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: ogImage });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
}

function buildRealEstateAgentJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: BUSINESS.name,
    jobTitle: BUSINESS.jobTitle,
    url: absoluteUrl("index.html"),
    image: absoluteAsset(BUSINESS.image),
    email: BUSINESS.email,
    telephone: BUSINESS.telephone,
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      addressCountry: BUSINESS.addressCountry,
    },
    areaServed: BUSINESS.areaServed.map((name) => ({
      "@type": "AdministrativeArea",
      name,
    })),
    parentOrganization: {
      "@type": "Organization",
      name: BUSINESS.parentOrg.name,
      url: BUSINESS.parentOrg.url,
    },
    sameAs: BUSINESS.sameAs,
  };
}

function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_DEFAULTS.siteName,
    url: absoluteUrl("index.html"),
    inLanguage: "cs-CZ",
    publisher: {
      "@type": "RealEstateAgent",
      name: BUSINESS.name,
      url: absoluteUrl("index.html"),
    },
  };
}

function buildBreadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function initStaticPageSeo(pageKey) {
  const page = PAGES[pageKey];
  if (!page) return;

  applySeo({
    title: page.title,
    description: page.description,
    url: absoluteUrl(page.path),
  });

  if (pageKey === "home") {
    upsertJsonLd("agent", buildRealEstateAgentJsonLd());
    upsertJsonLd("website", buildWebSiteJsonLd());
    return;
  }

  if (pageKey === "o-mne") {
    upsertJsonLd("person", {
      "@context": "https://schema.org",
      "@type": "Person",
      name: BUSINESS.name,
      jobTitle: BUSINESS.jobTitle,
      url: absoluteUrl(page.path),
      image: absoluteAsset(BUSINESS.image),
      email: BUSINESS.email,
      telephone: BUSINESS.telephone,
      worksFor: {
        "@type": "Organization",
        name: BUSINESS.parentOrg.name,
        url: BUSINESS.parentOrg.url,
      },
      sameAs: BUSINESS.sameAs,
    });
  }

  const crumbs = [{ name: "Domů", url: absoluteUrl("index.html") }];
  if (pageKey !== "home") {
    crumbs.push({ name: page.title.split("|")[0].trim(), url: absoluteUrl(page.path) });
  }
  upsertJsonLd("breadcrumbs", buildBreadcrumbJsonLd(crumbs));
}

export function applyPropertySeo(property) {
  if (!property) return;

  const title = `${property.title} | Monika Zelená`;
  const description = property.description
    ? `${property.description.slice(0, 155)}${property.description.length > 155 ? "…" : ""}`
    : `Nemovitost: ${property.title}. ${property.location}. Kontakt na realitní makléřku Moniku Zelenou.`;

  const image = property.image ? absoluteAsset(property.image) : absoluteAsset(SEO_DEFAULTS.defaultImage);
  const url = `${absoluteUrl("nemovitost-detail.html")}?id=${encodeURIComponent(property.id)}`;

  applySeo({
    title,
    description,
    url,
    image,
    imageAlt: property.title,
    type: "article",
  });

  upsertJsonLd("property", {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description || property.title,
    url,
    image: property.gallery?.length ? property.gallery.map((src) => absoluteAsset(src)) : [image],
    address: {
      "@type": "PostalAddress",
      streetAddress: property.location,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      addressCountry: BUSINESS.addressCountry,
    },
  });

  upsertJsonLd("breadcrumbs", buildBreadcrumbJsonLd([
    { name: "Domů", url: absoluteUrl("index.html") },
    { name: "Nemovitosti", url: absoluteUrl("nemovitosti.html") },
    { name: property.title, url },
  ]));
}

export function applyServiceSeo(service) {
  if (!service) return;

  const title = `${service.title} | Monika Zelená`;
  const description = `${service.short} Realitní makléřka Monika Zelená – Jihlava a Vysočina.`;
  const url = `${absoluteUrl("sluzba-detail.html")}?slug=${encodeURIComponent(service.slug)}`;

  applySeo({
    title,
    description,
    url,
  });

  upsertJsonLd("service", {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.short,
    url,
    provider: {
      "@type": "RealEstateAgent",
      name: BUSINESS.name,
      url: absoluteUrl("index.html"),
      telephone: BUSINESS.telephone,
      email: BUSINESS.email,
    },
    areaServed: BUSINESS.areaServed,
  });

  upsertJsonLd("breadcrumbs", buildBreadcrumbJsonLd([
    { name: "Domů", url: absoluteUrl("index.html") },
    { name: "Služby", url: absoluteUrl("sluzby.html") },
    { name: service.title, url },
  ]));
}

export { SITE_ORIGIN, absoluteUrl, absoluteAsset };
