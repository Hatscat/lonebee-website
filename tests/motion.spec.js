// @ts-check
import { expect, test } from "@playwright/test";
import { HERO } from "../site/js/hero-data.js";

/** Pixels of the hero canvas, as a data URL. */
const canvasPixels = (/** @type {import("@playwright/test").Page} */ page) =>
  page.locator(".hero-art canvas").evaluate((c) => /** @type {HTMLCanvasElement} */ (c).toDataURL());

test("the hero animates, starting from the very frame the still image shows", async ({ page }) => {
  // A paused clock holds requestAnimationFrame: the canvas shows only its first frame.
  await page.clock.install({ time: new Date("2026-06-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-06-01T12:00:01Z"));
  await page.goto("/");
  const canvas = page.locator(".hero-art canvas");
  await expect(canvas).toBeAttached();
  const same = await page.evaluate(async () => {
    const live = /** @type {HTMLCanvasElement} */ (document.querySelector(".hero-art canvas"));
    const still = /** @type {HTMLImageElement} */ (document.querySelector(".hero-art img"));
    await still.decode();
    const copy = document.createElement("canvas");
    copy.width = live.width;
    copy.height = live.height;
    const ctx = /** @type {CanvasRenderingContext2D} */ (copy.getContext("2d"));
    ctx.drawImage(still, 0, 0);
    const a = ctx.getImageData(0, 0, copy.width, copy.height).data;
    const b = /** @type {CanvasRenderingContext2D} */ (live.getContext("2d")).getImageData(0, 0, live.width, live.height).data;
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    return diff;
  });
  expect(same, "bytes differing between the still and the first frame").toBe(0);
  // Let time run: the scene moves.
  const before = await canvasPixels(page);
  await page.clock.runFor(1000);
  await page.clock.resume();
  await expect(page.locator("[data-hero]")).toHaveAttribute("data-motion", "playing");
  expect(await canvasPixels(page)).not.toBe(before);
});

test("the hero pauses off screen and plays again when back", async ({ page }) => {
  // On a held clock: the loop must not end while the page scrolls.
  await page.clock.install({ time: new Date("2026-06-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-06-01T12:00:01Z"));
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute("data-motion", "paused");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(hero).toHaveAttribute("data-motion", "playing");
});

test("the bee flies one loop, then rests on the still frame for good (WCAG 2.2.2)", async ({ page }) => {
  expect(HERO.flight.period, "motion that starts by itself stops within five seconds").toBeLessThanOrEqual(5);
  await page.clock.install({ time: new Date("2026-06-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-06-01T12:00:01Z"));
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(HERO.flight.period * 1000 + 500);
  await expect(hero).toHaveAttribute("data-motion", "still");
  const rest = await canvasPixels(page);
  await page.clock.runFor(2000);
  expect(await canvasPixels(page), "nothing moves after the loop").toBe(rest);
  const differs = await page.evaluate(async () => {
    const live = /** @type {HTMLCanvasElement} */ (document.querySelector(".hero-art canvas"));
    const still = /** @type {HTMLImageElement} */ (document.querySelector(".hero-art img"));
    await still.decode();
    const copy = document.createElement("canvas");
    copy.width = live.width;
    copy.height = live.height;
    const ctx = /** @type {CanvasRenderingContext2D} */ (copy.getContext("2d"));
    ctx.drawImage(still, 0, 0);
    const a = ctx.getImageData(0, 0, copy.width, copy.height).data;
    const b = /** @type {CanvasRenderingContext2D} */ (live.getContext("2d")).getImageData(0, 0, live.width, live.height).data;
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    return diff;
  });
  expect(differs, "it rests on the still frame").toBe(0);
});

test("reduced motion keeps the still image and no canvas shows", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveClass(/is-snapped/);
  await expect(hero).toHaveAttribute("data-motion", "still");
  await expect(hero.locator("img")).toBeVisible();
  await expect(hero.locator("canvas")).toBeHidden();
  await context.close();
});

test("without JavaScript, the page is complete", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".hero-art img")).toBeVisible();
  await expect(page.locator(".hero-art canvas")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const name of ["Limpid Chess", "Draw my code", "Draw my code Kids", "Truth Table Game"]) {
    await page.getByRole("heading", { name, exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.locator("#follow").getByRole("link", { name: "Follow on itch.io" })).toBeVisible();
  await context.close();
});
