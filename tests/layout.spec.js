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

test.describe("hero art on whole device pixels", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the desktop projects");

  for (const deviceScaleFactor of [1, 1.5, 2, 3]) {
    for (const width of [390, 1024, 1440, 1920]) {
      test(`${width}px at ${deviceScaleFactor}x`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor });
        const page = await context.newPage();
        await page.goto("/");
        await expect(page.locator(".hero-art")).toHaveClass(/is-snapped/);
        const geometry = await page.evaluate(() => {
          const box = /** @type {HTMLElement} */ (document.querySelector(".hero-art")).getBoundingClientRect();
          return [...document.querySelectorAll(".hero-art img, .hero-art canvas")].map((el) => {
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              width: r.width,
              left: r.left + scrollX,
              top: r.top + scrollY,
              covers: r.left <= box.left + 0.01 && r.top <= box.top + 0.01 && r.right >= box.right - 0.01 && r.bottom >= box.bottom - 0.01,
            };
          });
        });
        expect(geometry.length).toBeGreaterThan(0);
        for (const g of geometry) {
          const devicePixelsPerArtPixel = (g.width * deviceScaleFactor) / HERO.width;
          expect(Math.abs(devicePixelsPerArtPixel - Math.round(devicePixelsPerArtPixel)), `${g.tag} scale`).toBeLessThan(0.001);
          expect(Math.abs(g.left * deviceScaleFactor - Math.round(g.left * deviceScaleFactor)), `${g.tag} left`).toBeLessThan(0.01);
          expect(Math.abs(g.top * deviceScaleFactor - Math.round(g.top * deviceScaleFactor)), `${g.tag} top`).toBeLessThan(0.01);
          expect(g.covers, `${g.tag} covers the hero`).toBe(true);
        }
        await context.close();
      });
    }
  }
});

test("without JavaScript, the still art covers the hero around the same focus point", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const style = await page.locator(".hero-art img").evaluate((img) => {
    const s = getComputedStyle(img);
    return { fit: s.objectFit, position: s.objectPosition };
  });
  expect(style.fit).toBe("cover");
  const [x, y] = style.position.split(" ").map(parseFloat);
  expect([x / 100, y / 100]).toEqual(HERO.focus);
  await context.close();
});
