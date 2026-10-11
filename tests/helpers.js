// @ts-check
/**
 * Shared test helpers.
 */

export const ORIGIN = "https://lonebee.games";

/** The pages of the site, and the status each must answer with. */
export const PAGES = [
  { path: "/", status: 200 },
  { path: "/404.html", status: 200 },
  // GitHub Pages serves 404.html at any missing path, nested ones included.
  { path: "/no/such/page", status: 404 },
];

/**
 * Starts recording everything that should never happen on a page: console errors and warnings,
 * uncaught errors, failed requests, error responses, requests to other origins and Content
 * Security Policy violations. Call before navigating; read the array after.
 * @param {import("@playwright/test").Page} page
 * @param {{ allowStatus?: (url: string, status: number) => boolean }} [options]
 */
export function recordProblems(page, { allowStatus = () => false } = {}) {
  /** @type {string[]} */
  const problems = [];
  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") return;
    // Browsers log the status of a document that answers 404 on purpose: that one is expected.
    const status = message.text().match(/status of (\d{3})/);
    if (status && allowStatus(message.location().url, Number(status[1]))) return;
    problems.push(`console ${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
  page.on("requestfailed", (request) => problems.push(`failed: ${request.url()} ${request.failure()?.errorText ?? ""}`));
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400 && !allowStatus(response.url(), status)) problems.push(`HTTP ${status}: ${response.url()}`);
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (url.origin !== new URL(page.url() === "about:blank" ? request.url() : page.url()).origin) {
      problems.push(`off-origin request: ${request.url()}`);
    }
  });
  page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return problems;
}

/**
 * Width and height of a PNG, from its IHDR chunk.
 * @param {Buffer} png
 */
export function pngSize(png) {
  if (png.toString("latin1", 1, 4) !== "PNG") throw new Error("not a PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
