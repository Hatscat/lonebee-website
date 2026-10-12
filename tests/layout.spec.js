// @ts-check
import { expect, test } from "@playwright/test";
import { HERO } from "../site/js/hero-data.js";

const WIDTHS = [320, 360, 390, 414, 600, 768, 900, 1024, 1280, 1440, 1920, 2560];

test.describe("no horizontal scroll", () => {
  // Desktop browsers only: the phone projects have a fixed viewport of their own.
  test.skip(({ isMobile }) => isMobile, "covered by the desktop projects");

  for (const width of WIDTHS) {
    for (const path of ["/", "/no/such/page"]) {
      test(`${path} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => {
          const limit = document.documentElement.clientWidth;
          const offenders = [...document.querySelectorAll("body *")]
            .filter((el) => !el.closest(".hero-art") && !el.closest(".skip-link"))
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && (rect.right > limit + 0.5 || rect.left < -0.5);
            })
            .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
          return { scroll: document.documentElement.scrollWidth - limit, offenders };
        });
        expect(overflow.offenders).toEqual([]);
        expect(overflow.scroll).toBeLessThanOrEqual(0);
      });
    }
  }
});

/**
 * Viewports where the pin is decided: phones, the 1x rounding cliffs (just past a multiple of 300
 * device pixels), laptops, 1080p and 1440p desktops, 21:9 and 32:9.
 */
const PIN_SIZES = [
  [320, 700], [390, 844], [401, 800], [402, 874], [414, 896], [481, 800], [601, 800], [768, 1024], [1024, 700],
  [1100, 800], [1201, 800], [1366, 650], [1440, 780], [1801, 950], [1920, 950], [1920, 1100], [2401, 1300],
  [2560, 950], [2560, 1300], [3440, 1310], [5120, 1310],
];

/** The most rows of night hero.js may leave above the art (its GAP). */
const GAP = 30;

/**
 * The deepest top crop in this grid, in art rows: 21:9 and wider screens at their shortest, where
 * hero-bee-min holds the hero's height. Elsewhere it stays near the night; the bee starts at row 50.
 */
const MAX_CROP = 38;

/**
 * Checks the art against its box once hero.js has placed it: whole device pixels per art pixel,
 * flush with the box's right and bottom edges (within a device pixel), covering its left, and
 * either covering its top or leaving a band of night of GAP rows at most; the whole bee in view.
 * @param {import("@playwright/test").Page} page
 * @param {string} label
 * @returns {Promise<string[]>}
 */
async function pinFailures(page, label) {
  // hero.js snaps from a ResizeObserver: let it run before measuring.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return page.evaluate(
    ({ label, art, gap }) => {
      const dpr = devicePixelRatio;
      const el = /** @type {HTMLElement} */ (document.querySelector(".hero-art"));
      const box = el.getBoundingClientRect();
      const night = getComputedStyle(document.documentElement).getPropertyValue("--sky-top").trim();
      const background = getComputedStyle(el).backgroundColor;
      const hex = `#${(background.match(/\d+/g) ?? []).slice(0, 3).map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
      const out = [];
      for (const layer of el.querySelectorAll("img, canvas")) {
        const r = layer.getBoundingClientRect();
        const name = `${label} ${layer.tagName.toLowerCase()}`;
        const k = (r.width * dpr) / art.width;
        if (Math.abs(k - Math.round(k)) > 0.001) out.push(`${name}: ${k} device pixels per art pixel`);
        for (const [edge, v] of [["left", r.left + scrollX], ["top", r.top + scrollY]]) {
          if (Math.abs(v * dpr - Math.round(v * dpr)) > 0.01) out.push(`${name}: ${edge} edge off the device grid`);
        }
        // The box's edges on the device grid, as hero.js finds them: the art's right and bottom edges
        // must land on the box's far edges, rounded out to the grid (layout measures in 1/64 px).
        const [left, top] = [(box.left + scrollX) * dpr, (box.top + scrollY) * dpr];
        const R = Math.ceil((box.right + scrollX) * dpr - 1e-3);
        const B = Math.ceil((box.bottom + scrollY) * dpr - 1e-3);
        for (const [edge, at, want] of [["right", (r.right + scrollX) * dpr, R], ["bottom", (r.bottom + scrollY) * dpr, B]]) {
          if (Math.abs(at - want) > 0.05) out.push(`${name}: ${edge} edge at device px ${at.toFixed(2)}, not ${want}`);
        }
        // The scale the rule asks for: cover, or a step smaller with a band of night (hero.js snap).
        const [w, h] = [R - Math.floor(left + 1e-3), B - Math.floor(top + 1e-3)];
        const cover = Math.max(1, Math.ceil(Math.max(w / art.width, h / art.height) - 1e-6));
        const smaller = cover > 1 && art.height - h / cover > art.night && (cover - 1) * art.width >= w && h / (cover - 1) - art.height <= gap;
        if (Math.round(k) !== (smaller ? cover - 1 : cover)) out.push(`${name}: scale ${Math.round(k)}, the rule wants ${smaller ? cover - 1 : cover}`);
        if (r.left > box.left + 0.01) out.push(`${name}: the left edge shows the box`);
        const pixel = r.height / art.height;
        const band = (r.top - box.top) / pixel;
        if (band > 0.01 && (band > gap + 0.01 || hex !== night)) out.push(`${name}: ${band.toFixed(1)} rows of ${hex} above the art`);
        const crop = (box.top - r.top) / pixel;
        if (crop > art.maxCrop) out.push(`${name}: ${crop.toFixed(1)} rows cropped off the top`);
        const [x0, y0, x1, y1] = art.bee;
        const bee = { left: r.left + x0 * pixel, top: r.top + y0 * pixel, right: r.left + (x1 + 1) * pixel, bottom: r.top + (y1 + 1) * pixel };
        if (bee.left < box.left - 0.01 || bee.top < box.top - 0.01 || bee.right > box.right + 0.01 || bee.bottom > box.bottom + 0.01) {
          out.push(`${name}: the bee is cropped (${((box.top - r.top) / pixel).toFixed(1)} rows off the top)`);
        }
      }
      return out;
    },
    { label, art: { width: HERO.width, height: HERO.height, night: HERO.night, bee: HERO.bee.box, maxCrop: MAX_CROP }, gap: GAP },
  );
}

test.describe("the hero art, pinned to its box's bottom right on whole device pixels", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the desktop projects");
  // Each test resizes one page through the whole grid, up to 15360 device pixels wide in WebKit.
  test.slow();

  for (const deviceScaleFactor of [1, 1.1, 1.25, 1.5, 2, 3]) {
    test(`at ${deviceScaleFactor}x`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor });
      const page = await context.newPage();
      await page.goto("/");
      await expect(page.locator(".hero-art")).toHaveClass(/is-snapped/);
      await expect(page.locator(".hero-art canvas")).toBeAttached();
      const failures = [];
      // No screen is wider than 8K: skip the sizes that would exceed it at this ratio.
      for (const [width, height] of PIN_SIZES.filter(([width]) => width * deviceScaleFactor <= 7680)) {
        await page.setViewportSize({ width, height });
        failures.push(...(await pinFailures(page, `${width}x${height}@${deviceScaleFactor}`)));
      }
      expect(failures).toEqual([]);
      await context.close();
    });
  }

  test("in forced colors the art keeps its height, and the bee stays whole", async ({ browser, browserName }) => {
    test.skip(browserName !== "chromium", "forced colors are emulated in Chromium only");
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".hero-art canvas")).toBeAttached();
    const failures = [];
    for (const [width, height] of [[1100, 800], [1920, 950], [2560, 1300], [3440, 1310]]) {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ forcedColors: "none" });
      const normal = await page.locator(".hero-art").evaluate((el) => el.getBoundingClientRect().height);
      await page.emulateMedia({ forcedColors: "active" });
      const forced = await page.locator(".hero-art").evaluate((el) => el.getBoundingClientRect().height);
      if (Math.abs(forced - normal) > 0.5) failures.push(`${width}x${height}: ${forced}px in forced colors, ${normal}px otherwise`);
      failures.push(...(await pinFailures(page, `${width}x${height} in forced colors`)));
    }
    expect(failures).toEqual([]);
    await context.close();
  });
});

test("without JavaScript, the still art is pinned to the same corner", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const style = await page.locator(".hero-art img").evaluate((img) => {
    const s = getComputedStyle(img);
    return { fit: s.objectFit, position: s.objectPosition };
  });
  expect(style).toEqual({ fit: "cover", position: "100% 100%" });
  await context.close();
});
