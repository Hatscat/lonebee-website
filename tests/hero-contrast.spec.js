// @ts-check
/**
 * Text and controls laid over the hero art stay legible at every width: each one's box is mapped
 * onto the art pixels under it (both twinkle frames), and its color must contrast with every one
 * of them: 4.5:1 for text, 3:1 for a control's frame and for the focus ring around it.
 */
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decodePNG } from "../art/lib/png.js";
import { contrast } from "../scripts/tokens.js";
import { HERO } from "../site/js/hero-data.js";

const backgrounds = decodePNG(await readFile(new URL("../site/img/hero-bg.png", import.meta.url)));

/**
 * The art colors in a box of art pixels, over both twinkle frames.
 * @param {{ x0: number, y0: number, x1: number, y1: number }} box
 * @param {string} above the color above the art's top row
 */
function artColors(box, above) {
  const colors = new Set();
  // Above the art lies its box's night, where hero.js leaves a band.
  if (box.y0 < 0) colors.add(above);
  for (let frame = 0; frame < HERO.background.frames; frame++) {
    for (let y = Math.max(0, box.y0); y <= Math.min(HERO.height - 1, box.y1); y++) {
      for (let x = Math.max(0, box.x0); x <= Math.min(HERO.width - 1, box.x1); x++) {
        const i = ((frame * HERO.height + y) * HERO.width + x) * 4;
        const rgba = backgrounds.rgba;
        colors.add(`#${[rgba[i], rgba[i + 1], rgba[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
      }
    }
  }
  return colors;
}

/** @param {string} css "rgb(r, g, b)" */
const hex = (css) => `#${(css.match(/\d+/g) ?? []).slice(0, 3).map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;

const SIZES = [360, 390, 768, 1024, 1100, 1180, 1280, 1366, 1440, 1680, 1920, 2560];

/**
 * Where the pin pushes the copy furthest into the art: just past a multiple of 300 device pixels,
 * where the scale steps up, and at 110% zoom.
 */
const CLIFFS = [[1100, 1.1], [1201, 1], [1501, 1], [1801, 1], [2401, 1], [3001, 1]];

/** The art's dark zone under the copy (hero-art.node.spec.js): columns 0 to 150, rows 0 to 105. */
const COPY_ZONE = { x1: 150, y1: 105 };

test.describe("over the hero art", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the desktop projects at phone widths");

  const cases = [...SIZES.flatMap((width) => [[width, 1], [width, 2]]), ...CLIFFS];
  for (const [width, deviceScaleFactor] of cases) {
    {
      test(`${width}px at ${deviceScaleFactor}x`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor });
        const page = await context.newPage();
        await page.goto("/");
        await expect(page.locator(".hero-art")).toHaveClass(/is-snapped/);
        await page.evaluate(() => document.fonts.ready);
        const { art, hero, above, items } = await page.evaluate(() => {
          /** @param {Element} el */
          const textBox = (el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return range.getBoundingClientRect().toJSON();
          };
          const heroBox = /** @type {HTMLElement} */ (document.querySelector(".hero-art")).getBoundingClientRect().toJSON();
          const above = getComputedStyle(document.documentElement).getPropertyValue("--sky-top").trim();
          const artBox = /** @type {HTMLElement} */ (document.querySelector(".hero-art img")).getBoundingClientRect().toJSON();
          const found = [];
          for (const el of document.querySelectorAll(".hero-title, .hero-tagline, .site-nav a")) {
            found.push({ name: el.textContent?.trim(), kind: "text", copy: el.closest(".hero") !== null, box: textBox(el), color: getComputedStyle(el).color });
          }
          for (const el of document.querySelectorAll(".hero .button")) {
            const box = el.getBoundingClientRect().toJSON();
            const style = getComputedStyle(el);
            // The visible edge: the frame of one UI pixel around the box, plus the drop.
            const frame = style.boxShadow.match(/rgb\([^)]+\)/)?.[0] ?? style.backgroundColor;
            const copy = !el.classList.contains("hero-replay");
            found.push({ name: el.textContent?.trim(), kind: "control", copy, box: { ...box, left: box.left - 2, top: box.top - 2, right: box.right + 6, bottom: box.bottom + 6 }, color: frame });
            const root = getComputedStyle(document.documentElement);
            const ring = parseFloat(root.getPropertyValue("--focus-offset-button")) + parseFloat(root.getPropertyValue("--focus-width"));
            found.push({ name: `${el.textContent?.trim()} focus ring`, kind: "control", copy, box: { ...box, left: box.left - ring, top: box.top - ring, right: box.right + ring, bottom: box.bottom + ring }, color: root.getPropertyValue("--focus").trim() });
          }
          return { art: artBox, hero: heroBox, above, items: found };
        });
        const scale = art.width / HERO.width;
        const failures = [];
        let checked = 0;
        for (const item of items) {
          // Only the part of the box over the visible art counts.
          const left = Math.max(item.box.left, hero.left);
          const right = Math.min(item.box.right, hero.right);
          const top = Math.max(item.box.top, hero.top);
          const bottom = Math.min(item.box.bottom, hero.bottom);
          if (right <= left || bottom <= top) continue;
          checked++;
          const box = {
            x0: Math.floor((left - art.left) / scale),
            x1: Math.floor((right - art.left - 0.01) / scale),
            y0: Math.floor((top - art.top) / scale),
            y1: Math.floor((bottom - art.top - 0.01) / scale),
          };
          // From 1100px the copy must stay in the art's dark zone, whatever its colors happen to meet.
          if (width >= 1100 && item.copy && (box.x1 > COPY_ZONE.x1 || box.y1 > COPY_ZONE.y1)) {
            failures.push(`${item.name} reaches art column ${box.x1}, row ${box.y1}: past the dark zone`);
          }
          const ink = item.color.startsWith("#") ? item.color : hex(item.color);
          const need = item.kind === "text" ? 4.5 : 3;
          for (const ground of artColors(box, above)) {
            const ratio = contrast(ink, ground);
            if (ratio < need) failures.push(`${item.name} (${ink}) on ${ground}: ${ratio.toFixed(2)}:1 < ${need}`);
          }
        }
        // Under 1100px the copy follows the art; from 1100px it lies on the art's calm sky.
        if (width >= 1100) expect(checked, "the copy lies over the art").toBeGreaterThan(0);
        expect([...new Set(failures)]).toEqual([]);
        await context.close();
      });
    }
  }
});
