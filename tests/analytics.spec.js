// @ts-check
/**
 * Umami on the production host only. The site is served here under https://lonebee.games by
 * routing that origin to the local server, and Umami's tracker is a stub: no request leaves the
 * machine.
 */
import { expect, test } from "@playwright/test";
import { UMAMI } from "../site/js/analytics.js";

const PRODUCTION = "https://lonebee.games";

/** @param {import("@playwright/test").Page} page */
async function asProduction(page, baseURL = "") {
  /** @type {string[]} */
  const umami = [];
  await page.route(`${PRODUCTION}/**`, async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await page.route(/^https:\/\/(cloud|gateway)\.umami\.is\//, async (route) => {
    umami.push(route.request().url());
    await route.fulfill({
      contentType: "text/javascript",
      // Records what the real tracker would read from its own tag.
      body: "window.__umami = Object.assign({}, document.currentScript.dataset);",
    });
  });
  return umami;
}

for (const path of ["/", "/no/such/page"]) {
  test(`${path} on lonebee.games loads Umami once, with the shared website and its guards`, async ({ page, baseURL }) => {
    const umami = await asProduction(page, baseURL);
    await page.goto(`${PRODUCTION}${path}`);
    await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__umami)).toBeTruthy();
    const tags = page.locator(`script[src="${UMAMI.src}"]`);
    await expect(tags).toHaveCount(1);
    expect(await page.evaluate(() => /** @type {any} */ (window).__umami)).toEqual({
      websiteId: UMAMI.websiteId,
      domains: "lonebee.games",
      excludeSearch: "true",
      excludeHash: "true",
    });
    expect(umami).toEqual([UMAMI.src]);
  });
}

test("anywhere else, nothing is sent and no tracker loads", async ({ page }) => {
  /** @type {string[]} */
  const umami = [];
  page.on("request", (request) => {
    if (/umami\.is/.test(request.url())) umami.push(request.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`script[src="${UMAMI.src}"]`)).toHaveCount(0);
  expect(umami).toEqual([]);
});
