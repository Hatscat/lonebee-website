// @ts-check
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decodeICO } from "../art/lib/ico.js";
import { decodePNG } from "../art/lib/png.js";
import { ORIGIN, pngSize } from "./helpers.js";

const tokens = JSON.parse(await readFile(new URL("../design/tokens.json", import.meta.url), "utf8"));
/** @param {string} name a color token, followed through its alias */
function color(name) {
  const token = tokens.color.tokens.find((/** @type {{ name: string }} */ t) => t.name === name);
  const value = typeof token.value === "string" ? token.value : Object.values(token.value)[0];
  return value.startsWith("{") ? color(value.slice(1, -1)) : value;
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} selector
 */
const attr = (page, selector, name = "content") => page.locator(selector).getAttribute(name);

test.describe("home page head", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("title, description and canonical URL", async ({ page }) => {
    await expect(page).toHaveTitle("Lone Bee · Indie games");
    const description = /** @type {string} */ (await attr(page, 'meta[name="description"]'));
    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(await attr(page, 'link[rel="canonical"]', "href")).toBe(`${ORIGIN}/`);
  });

  test("link previews: Open Graph and Twitter", async ({ page, request }) => {
    expect(await attr(page, 'meta[property="og:type"]')).toBe("website");
    expect(await attr(page, 'meta[property="og:site_name"]')).toBe("Lone Bee");
    expect(await attr(page, 'meta[property="og:title"]')).toBe("Lone Bee");
    expect(await attr(page, 'meta[property="og:description"]')).toMatch(/^\S.{30,}$/);
    expect(await attr(page, 'meta[property="og:url"]')).toBe(`${ORIGIN}/`);
    expect(await attr(page, 'meta[property="og:image:alt"]')).toMatch(/^\S.{30,}$/);
    expect(await attr(page, 'meta[name="twitter:card"]')).toBe("summary_large_image");
    const image = /** @type {string} */ (await attr(page, 'meta[property="og:image"]'));
    expect(image.startsWith(`${ORIGIN}/`), "an absolute URL on the site").toBe(true);
    const response = await request.get(image.slice(ORIGIN.length));
    expect(response.status()).toBe(200);
    const size = pngSize(await response.body());
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(await attr(page, 'meta[property="og:image:width"]')).toBe(String(size.width));
    expect(await attr(page, 'meta[property="og:image:height"]')).toBe(String(size.height));
  });

  test("structured data describes the studio", async ({ page, request }) => {
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(/** @type {string} */ (json));
    const org = data["@graph"].find((/** @type {{ "@type": string }} */ n) => n["@type"] === "Organization");
    expect(org).toMatchObject({ name: "Lone Bee", url: `${ORIGIN}/`, email: "lone.bee.dev@gmail.com" });
    expect(org.sameAs).toEqual(["https://lone-bee.itch.io/", "https://github.com/Hatscat"]);
    const logo = await request.get(org.logo.slice(ORIGIN.length));
    expect(logo.status()).toBe(200);
    // Google wants a logo of at least 112×112, and shows it on white: an opaque tile, never the
    // transparent mark, whose cool rim is drawn for dark grounds.
    const { width, rgba } = decodePNG(await logo.body());
    expect(width).toBeGreaterThanOrEqual(112);
    for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) throw new Error("the logo has transparent pixels");
    const site = data["@graph"].find((/** @type {{ "@type": string }} */ n) => n["@type"] === "WebSite");
    expect(site.publisher["@id"]).toBe(org["@id"]);
  });

  test("the browser colors come from the tokens", async ({ page }) => {
    expect(await attr(page, 'meta[name="theme-color"]')).toBe(color("bg"));
    expect(await attr(page, 'meta[name="color-scheme"]')).toBe("dark");
  });

  test("the preloaded fonts are fonts the tokens declare", async ({ page }) => {
    const hrefs = await page.locator('link[rel="preload"][as="font"]').evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    const files = tokens.type.fonts.map((/** @type {{ file: string }} */ f) => `/${f.file}`);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(files).toContain(href);
  });
});

test("the web app manifest and its icons", async ({ page, request }) => {
  await page.goto("/");
  const href = /** @type {string} */ (await attr(page, 'link[rel="manifest"]', "href"));
  const response = await request.get(href);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: "Lone Bee", short_name: "Lone Bee", start_url: "/", scope: "/" });
  expect(manifest.theme_color).toBe(color("bg"));
  expect(manifest.background_color).toBe(color("bg"));
  /** @type {string[]} */
  const kinds = [];
  for (const icon of manifest.icons) {
    const png = await request.get(icon.src);
    expect(png.status(), icon.src).toBe(200);
    const { width, height } = pngSize(await png.body());
    expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
    expect(icon.type).toBe("image/png");
    kinds.push(`${icon.sizes} ${icon.purpose ?? "any"}`);
  }
  expect(kinds).toEqual(expect.arrayContaining(["192x192 any", "512x512 any", "512x512 maskable"]));
});

test("favicon.ico holds 16, 32 and 48 pixel frames", async ({ request }) => {
  const frames = decodeICO(await (await request.get("/favicon.ico")).body());
  expect(frames.map((f) => f.size)).toEqual([16, 32, 48]);
  for (const frame of frames) expect(pngSize(frame.png)).toEqual({ width: frame.size, height: frame.size });
});

test("the Apple touch icon is 180×180 and opaque", async ({ request }) => {
  const { width, height, rgba } = decodePNG(await (await request.get("/apple-touch-icon.png")).body());
  expect([width, height]).toEqual([180, 180]);
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) throw new Error("transparent pixel");
});

test("robots.txt and the sitemap point at each other", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([`${ORIGIN}/`]);
});

test("the 404 page stays out of search results", async ({ page }) => {
  const response = await page.goto("/no/such/page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found · Lone Bee");
  expect(await attr(page, 'meta[name="robots"]')).toBe("noindex");
  await expect(page.getByRole("link", { name: "Back to the home page" })).toHaveAttribute("href", "/");
});
