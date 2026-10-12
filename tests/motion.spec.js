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
 * Bytes that differ between the hero canvas and the still image.
 * @param {import("@playwright/test").Page} page
 */
const stillDiff = (page) =>
  page.evaluate(async () => {
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

/**
 * Pretends the tab is hidden or shown, as Playwright never hides a page.
 * @param {import("@playwright/test").Page} page
 * @param {boolean} hidden
 */
const setHidden = (page, hidden) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);

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

test("clicks on the copy, between its buttons or through a text selection leave the art alone", async ({ page, isMobile }) => {
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
      "the gap between the buttons": { x: (primary.right + secondary.left) / 2, y: mid(primary) },
      start: { x: tagline.left + 2, y: mid(tagline) },
      beside: { x: tagline.right + 40, y: mid(tagline) },
    };
  });
  for (const name of ["title", "tagline", "the gap between the buttons"]) {
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
  // The same drag again selects the same text: still no click on the art.
  await page.mouse.move(at.start.x, at.start.y);
  await page.mouse.down();
  await page.mouse.move(at.beside.x, at.beside.y, { steps: 5 });
  await page.mouse.up();
  await page.clock.runFor(100);
  await expect(hero, "after the same selection again").toHaveAttribute("data-motion", "still");
  await page.evaluate(() => document.getSelection()?.removeAllRanges());
  await page.mouse.click(at.beside.x, at.beside.y);
  await expect(hero, "beside the tagline, on the art").toHaveAttribute("data-motion", "playing");
});

test("Replay, for the keyboard: after the hero's buttons, out of sight until focused; Enter plays a loop", async ({ page }) => {
  const hero = await atRest(page);
  const replay = page.getByRole("button", { name: "Replay the animation" });
  await expect(replay).toBeAttached();
  await expect(replay).toHaveText("Replay");
  // A button like the hero's links: no browser border, the same height.
  const look = await replay.evaluate((b) => ({
    border: getComputedStyle(b).borderTopWidth,
    height: b.getBoundingClientRect().height,
    link: /** @type {Element} */ (document.querySelector(".hero .actions .button")).getBoundingClientRect().height,
  }));
  expect(look.border).toBe("0px");
  expect(look.height).toBe(look.link);
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

test("a hidden tab pauses the flight, which plays on from the same frame once the tab shows", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-06-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-06-01T12:00:01Z"));
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(1000);
  const before = await canvasPixels(page);
  await setHidden(page, true);
  await expect(hero).toHaveAttribute("data-motion", "paused");
  await page.clock.runFor(6000);
  expect(await canvasPixels(page), "nothing moved while hidden").toBe(before);
  await setHidden(page, false);
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(2500); // 3.5 s of the loop flown
  await expect(hero, "three seconds were still to fly").toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(1000);
  await expect(hero).toHaveAttribute("data-motion", "still");
});

test("a page opened in a hidden tab keeps its first loop for when it shows", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
  });
  await page.clock.install({ time: new Date("2026-06-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-06-01T12:00:01Z"));
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(page.locator(".hero-art canvas")).toBeAttached();
  await page.clock.runFor(6000);
  await expect(hero, "nothing flies while hidden").toHaveAttribute("data-motion", "still");
  expect(await stillDiff(page)).toBe(0);
  await setHidden(page, false);
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(3500);
  await expect(hero, "the whole loop, once shown").toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(1000);
  await expect(hero).toHaveAttribute("data-motion", "still");
});

test("one long frame still lands on the still frame, and the next loop starts from it", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-06-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-06-01T12:00:01Z"));
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveAttribute("data-motion", "playing");
  await page.clock.runFor(1000);
  await page.clock.fastForward(4300); // a stall: the next frame comes past the loop's end
  await page.clock.runFor(50);
  await expect(hero).toHaveAttribute("data-motion", "still");
  expect(await stillDiff(page), "it rests on the still frame").toBe(0);
  const rest = await canvasPixels(page);
  await clickArt(page, BEE);
  await page.clock.runFor(40);
  expect(await canvasPixels(page), "the next loop starts from the still frame").toBe(rest);
});

test("a selection made before, elsewhere on the page, doesn't keep the art from replaying", async ({ page }) => {
  const hero = await atRest(page);
  await page.evaluate(() => document.getSelection()?.selectAllChildren(/** @type {Element} */ (document.querySelector("#follow .section-lead"))));
  await clickArt(page, BEE);
  await expect(hero).toHaveAttribute("data-motion", "playing");
});

test("under 1100px, clicks on the copy under the art leave the art alone", async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 390, height: 844 });
  const hero = await atRest(page);
  const at = await page.evaluate(() => {
    const art = /** @type {Element} */ (document.querySelector(".hero-art")).getBoundingClientRect();
    const actions = /** @type {Element} */ (document.querySelector(".hero .actions")).getBoundingClientRect();
    return {
      "just under the art": { x: art.left + art.width / 2, y: art.bottom + 8 },
      "just above the buttons": { x: art.left + art.width / 2, y: actions.top - 8 },
    };
  });
  for (const [name, point] of Object.entries(at)) {
    await page.mouse.click(point.x, point.y);
    await page.clock.runFor(100);
    await expect(hero, name).toHaveAttribute("data-motion", "still");
  }
});

test("a click on a hero button's frame or drop follows the button, and leaves the art alone", async ({ page, isMobile }) => {
  test.skip(isMobile, "the copy lies on the art from 1100px wide");
  await page.setViewportSize({ width: 1440, height: 900 });
  const hero = await atRest(page);
  const primary = await page.locator(".hero .actions .button-primary").evaluate((b) => b.getBoundingClientRect().toJSON());
  // One UI pixel under the box: the bottom of its amber drop.
  await page.mouse.click(primary.left + primary.width / 2, primary.bottom + 1);
  await expect(page).toHaveURL(/#games$/);
  await expect(hero).toHaveAttribute("data-motion", "still");
});

test("from 1100px, every part of the bee answers a click: none lies under the copy's text or buttons", async ({ browser, isMobile }) => {
  test.skip(isMobile, "the copy lies on the art from 1100px wide");
  const blocked = [];
  for (const [width, height, deviceScaleFactor] of [[1280, 720, 1], [1280, 720, 2], [1440, 900, 1], [1440, 900, 2], [1920, 950, 1]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".hero-art canvas")).toBeAttached();
    const points = await page.evaluate((box) => {
      const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector(".hero-art canvas")).getBoundingClientRect();
      const size = canvas.width / 300;
      const out = [];
      for (let row = box[1]; row <= box[3]; row += 2) {
        for (let col = box[0]; col <= box[2]; col += 2) {
          const hit = document.elementFromPoint(canvas.left + (col + 0.5) * size, canvas.top + (row + 0.5) * size);
          if (hit?.closest("a, button, .hero-title, .hero-tagline, .actions")) out.push(`${col},${row}`);
        }
      }
      return out;
    }, HERO.bee.box);
    blocked.push(...points.map((p) => `${width}x${height}@${deviceScaleFactor}: ${p}`));
    await context.close();
  }
  expect(blocked).toEqual([]);
});

test("focused, Replay shows whole under the hero's buttons; pressed, the bee flies in view", async ({ browser, isMobile }) => {
  test.skip(isMobile, "sized desktop windows");
  test.slow();
  for (const [width, height] of [[600, 800], [768, 1000], [1024, 768], [1280, 720], [1366, 650], [1440, 800], [1536, 770], [1920, 950], [2560, 1300]]) {
    const where = `${width}x${height}`;
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto("/");
    const replay = page.getByRole("button", { name: "Replay the animation" });
    await expect(replay).toBeAttached();
    await page.locator(".hero").getByRole("link", { name: "Follow on itch.io" }).focus();
    await page.keyboard.press("Tab");
    await expect(replay).toBeFocused();
    const shown = () =>
      replay.evaluate((b) => {
        const s = getComputedStyle(b);
        const ring = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
        const r = b.getBoundingClientRect();
        const actions = /** @type {Element} */ (document.querySelector(".hero .actions")).getBoundingClientRect();
        const art = /** @type {Element} */ (document.querySelector(".hero-art")).getBoundingClientRect();
        const onArt = r.top - ring >= art.top && r.bottom + ring <= art.bottom && r.left - ring >= art.left && r.right + ring <= art.right;
        return { under: r.top >= actions.bottom, whole: r.top - ring >= 0 && r.bottom + ring <= innerHeight && r.left - ring >= 0 && r.right + ring <= innerWidth, onArt, scrolled: scrollY };
      });
    // Smooth scrolling brings it into view over a few frames.
    await expect.poll(async () => (await shown()).whole, { message: `${where}: the whole ring in view`, timeout: 5000 }).toBe(true);
    const place = await shown();
    expect(place.under, `${where}: under the hero's buttons`).toBe(true);
    if (width >= 1100) {
      expect(place.onArt, `${where}: on the art, ring included`).toBe(true);
      expect(place.scrolled, `${where}: focusing it scrolls nothing`).toBe(0);
    }
    await page.keyboard.press("Enter");
    const beeInView = () =>
      page.evaluate(() => {
        const r = /** @type {Element} */ (document.querySelector(".hero-bee")).getBoundingClientRect();
        const seen = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
        return seen / r.height >= 0.5 && /** @type {HTMLElement} */ (document.querySelector("[data-hero]")).dataset.motion === "playing";
      });
    await expect.poll(beeInView, { message: `${where}: the bee flies in view`, timeout: 5000 }).toBe(true);
    await context.close();
  }
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
