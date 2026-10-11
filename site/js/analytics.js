// @ts-check
/**
 * Visit counts with Umami Cloud, set up as Draw my code does it: the one website the Hobby plan
 * allows serves every Lone Bee site, each told apart by its hostname. Page views only, with no
 * custom event: no cookie, nothing that identifies a visitor, and no click handler (Umami holds a
 * tracked link until its request ends, which would slow the way to the games). The tracker loads
 * on the production host only, so local runs and tests never contact Umami.
 */

/** Umami Cloud's tracker, and the website shared by every lonebee.games site. */
export const UMAMI = {
  src: "https://cloud.umami.is/script.js",
  websiteId: "2aa3ca82-247a-4156-b00f-62b35d4f1ea3",
  host: "lonebee.games",
};

/**
 * Adds the tracker to the page, on the production host only.
 * @param {Document} doc
 * @param {string} hostname
 * @returns {HTMLScriptElement | null} the script added, if any
 */
export function startAnalytics(doc, hostname) {
  if (hostname !== UMAMI.host) return null;
  const script = doc.createElement("script");
  script.src = UMAMI.src;
  script.dataset.websiteId = UMAMI.websiteId;
  // The tracker also checks the host itself: a second guard.
  script.dataset.domains = UMAMI.host;
  // Shared links come back with click ids (fbclid, gclid…) that Umami would store.
  script.dataset.excludeSearch = "true";
  // An in-page anchor (#games) is the same page.
  script.dataset.excludeHash = "true";
  doc.head.append(script);
  return script;
}

if (typeof document !== "undefined") startAnalytics(document, location.hostname);
