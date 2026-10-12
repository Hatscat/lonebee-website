// @ts-check
import { expect, test } from "@playwright/test";
import { HERO } from "../site/js/hero-data.js";

/** Pixels of the hero canvas, as a data URL. */
const canvasPixels = (/** @type {import("@playwright/test").Page} */ page) =>
  page.locator(".hero-art canvas").evaluate((c) => /** @type {HTMLCanvasElement} */ (c).toDataURL());

/** The middle of the bee, in scene pixels. */
const BEE = /** @type {[number, number]} */ ([
  Math.round((HERO.bee.box[0] + HERO.bee.box[2]) / 2),
  Math.round((HERO.bee.box[1] + HERO.bee.box[3]) / 2),
]);

/**
 * Clicks the hero art at a scene pixel, as a visitor would, through whatever lies on it.
 * @param {import("@playwright/test").Page} page
 * @param {[number, number]} pixel
 * @param {string} [layer] the art layer to aim through: the canvas, or the still image
 */
async function clickArt(page, pixel, layer = "canvas") {
  const point = await page.locator(`.hero-art ${layer}`).evaluate((el, [col, row]) => {
    const r = el.getBoundingClientRect();
    const size = r.width / 300;
    return { x: r.left + (col + 0.5) * size, y: r.top + (row + 0.5) * size };
  }, pixel);
  await page.mouse.click(point.x, point.y);
}

/**
 * Opens the home page on a held clock and lets the first loop end.
 * @param {import("@playwright/test").Page} page
 */
async function atRest(page) {
  await page.clock.install({ time: new Date("2026-06-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-06-01T12:00:01Z"));
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(HERO.flight.period * 1000 + 500);
  await expect(hero).toHaveAttribute("data-motion", "still");
  return hero;
}

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

test("by itself, the bee flies one loop, then rests on the still frame (WCAG 2.2.2)", async ({ page }) => {
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

test("reduced motion keeps the still image: no canvas, no Replay, and a click on the art does nothing", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveClass(/is-snapped/);
  await expect(hero).toHaveAttribute("data-motion", "still");
  await expect(hero.locator("img")).toBeVisible();
  await expect(hero.locator("canvas")).toBeHidden();
  await expect(page.locator(".hero-replay")).toBeAttached();
  await expect(page.locator(".hero-replay")).toBeHidden();
  await clickArt(page, BEE, "img");
  await expect(hero).toHaveAttribute("data-motion", "still");
  await expect(hero.locator("canvas")).toBeHidden();
  await context.close();
});

test("a click on the art plays one more loop, which ends on the still frame", async ({ page }) => {
  const hero = await atRest(page);
  const rest = await canvasPixels(page);
  await clickArt(page, BEE);
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(1000);
  expect(await canvasPixels(page), "the bee flies again").not.toBe(rest);
  await page.clock.runFor(HERO.flight.period * 1000);
  await expect(hero).toHaveAttribute("data-motion", "still");
  expect(await canvasPixels(page), "back on the still frame").toBe(rest);
});

test("a click with half a loop or more to fly adds nothing; a later one adds a loop, without a jump", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-06-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-06-01T12:00:01Z"));
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(1000); // 1 s into the loop: 3 s still to fly
  await clickArt(page, BEE);
  await page.clock.runFor(2500); // 3.5 s
  const late = await canvasPixels(page);
  await page.clock.runFor(1000); // 4.5 s: the loop has ended, the click added nothing
  await expect(hero).toHaveAttribute("data-motion", "still");
  await clickArt(page, BEE); // at rest: one more loop, on to 8 s
  await page.clock.runFor(2500); // 6.5 s: 1.5 s still to fly
  await clickArt(page, BEE); // one more loop, on to 12 s
  await page.clock.runFor(1000); // 7.5 s, a loop after 3.5 s
  expect(await canvasPixels(page), "the bee flies on: the frame of 3.5 s, a loop later").toBe(late);
  await page.clock.runFor(4000); // 11.5 s
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(1000); // 12.5 s
  await expect(hero).toHaveAttribute("data-motion", "still");
});

test("clicks on the copy, by its buttons or through a text selection leave the art alone", async ({ page, isMobile }) => {
  test.skip(isMobile, "the copy lies on the art from 1100px wide");
  await page.setViewportSize({ width: 1440, height: 900 });
  const hero = await atRest(page);
  const at = await page.evaluate(() => {
    const box = (/** @type {string} */ s) => /** @type {Element} */ (document.querySelector(s)).getBoundingClientRect();
    const [primary, secondary] = [...document.querySelectorAll(".hero .actions .button")].map((b) => b.getBoundingClientRect());
    const [title, tagline] = [box(".hero-title"), box(".hero-tagline")];
    const mid = (/** @type {DOMRect} */ r) => r.top + r.height / 2;
    return {
      title: { x: title.left + title.width / 2, y: mid(title) },
      tagline: { x: tagline.left + 20, y: mid(tagline) },
      "the primary button's drop": { x: primary.right + 3, y: mid(primary) },
      "the gap between the buttons": { x: (primary.right + secondary.left) / 2, y: mid(primary) },
      start: { x: tagline.left + 2, y: mid(tagline) },
      beside: { x: tagline.right + 40, y: mid(tagline) },
    };
  });
  for (const name of ["title", "tagline", "the primary button's drop", "the gap between the buttons"]) {
    await page.mouse.click(at[name].x, at[name].y);
    await page.clock.runFor(100);
    await expect(hero, name).toHaveAttribute("data-motion", "still");
  }
  // A drag from the tagline out over the sky selects text; its click is no click on the art.
  await page.mouse.move(at.start.x, at.start.y);
  await page.mouse.down();
  await page.mouse.move(at.beside.x, at.beside.y, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => String(document.getSelection())), "text is selected").not.toBe("");
  await page.clock.runFor(100);
  await expect(hero, "after a selection").toHaveAttribute("data-motion", "still");
  await page.evaluate(() => document.getSelection()?.removeAllRanges());
  await page.mouse.click(at.beside.x, at.beside.y);
  await expect(hero, "beside the tagline, on the art").toHaveAttribute("data-motion", "playing");
});

test("Replay, for the keyboard: after the hero's buttons, out of sight until focused; Enter plays a loop", async ({ page }) => {
  const hero = await atRest(page);
  const replay = page.getByRole("button", { name: "Replay the animation" });
  await expect(replay).toBeAttached();
  await expect(replay).toHaveText("Replay");
  const clip = () => replay.evaluate((b) => getComputedStyle(b).clipPath);
  expect(await clip(), "out of sight").not.toBe("none");
  await page.locator(".hero").getByRole("link", { name: "Follow on itch.io" }).focus();
  await page.keyboard.press("Tab");
  await expect(replay).toBeFocused();
  expect(await clip(), "in sight once focused").toBe("none");
  await expect(replay).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(hero).toHaveAttribute("data-motion", "playing");
});

test("without JavaScript, the page is complete", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".hero-art img")).toBeVisible();
  await expect(page.locator(".hero-art canvas")).toHaveCount(0);
  await expect(page.locator(".hero-replay"), "no control that would do nothing").toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const name of ["Limpid Chess", "Draw my code", "Draw my code Junior", "Truth Table Game"]) {
    await page.getByRole("heading", { name, exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.locator("#follow").getByRole("link", { name: "Follow on itch.io" })).toBeVisible();
  await context.close();
});
