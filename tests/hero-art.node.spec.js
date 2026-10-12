// @ts-check
/**
 * The hero art's contract with the page: the header and the hero copy lie over parts of it, so
 * those parts stay dark whatever the art becomes; its last rows are the page background, so it
 * melts into the page.
 */
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { beeBox, heroFrame } from "../art/build.js";
import { decodePNG } from "../art/lib/png.js";
import { C, PALETTE } from "../art/palette.js";
import { BEE, MOTION, SCENE, background, beeFrames } from "../art/pieces/hero.js";
import { HERO } from "../site/js/hero-data.js";

/** Colors allowed under the header (rows 0 to 19). Deep teal only as a few star pixels. */
const HEADER = { cols: [0, 299], rows: [0, 19], allowed: ["night", "dusk", "slate", "deep-teal"] };
/** Colors allowed under the hero copy on wide screens. */
const COPY = {
  cols: [0, 150],
  rows: [0, 105],
  allowed: ["night", "dusk", "slate", "deep-teal", "hive", "comb-black", "propolis", "bark", "wine", "moss"],
};

/**
 * @param {import("../art/lib/raster.js").Raster} raster
 * @param {{ cols: number[], rows: number[], allowed: string[] }} zone
 */
function strays(raster, zone) {
  const allowed = new Set(zone.allowed.map((name) => C[name]));
  const out = [];
  for (let y = zone.rows[0]; y <= zone.rows[1]; y++) {
    for (let x = zone.cols[0]; x <= zone.cols[1]; x++) {
      const color = raster.get(x, y);
      if (color !== null && !allowed.has(color)) out.push(`${x},${y} ${color}`);
    }
  }
  return out;
}

test("the scene keeps its size and its data matches the page's", () => {
  expect([SCENE.width, SCENE.height]).toEqual([300, 150]);
  expect(HERO.width).toBe(SCENE.width);
  expect(HERO.height).toBe(SCENE.height);
  expect(HERO.night).toBe(SCENE.night);
  expect(HERO.bee.box).toEqual(beeBox());
  expect(HERO.fps).toBe(MOTION.fps);
});

test("the rows the page may crop off the top are night, and the bee is far below them", () => {
  for (const frame of [0, 1]) {
    const art = background(frame);
    for (let y = 0; y < SCENE.night; y++) {
      let night = 0;
      for (let x = 0; x < SCENE.width; x++) if (art.get(x, y) === C.night) night++;
      // Bare night, then night dashes thinning into dusk down to the middle of the edge.
      expect(night / SCENE.width, `frame ${frame}, row ${y}`).toBeGreaterThanOrEqual(0.5);
    }
  }
  const [, top] = beeBox();
  expect(top, "the bee's top row").toBeGreaterThan(2 * SCENE.night);
});

for (const frame of [0, 1]) {
  test(`frame ${frame}: dark under the header and the copy, page background at the bottom`, () => {
    const art = background(frame);
    expect(strays(art, HEADER)).toEqual([]);
    expect(strays(art, COPY)).toEqual([]);
    for (let y = SCENE.height - 6; y < SCENE.height; y++) {
      for (let x = 0; x < SCENE.width; x++) expect(art.get(x, y), `${x},${y}`).toBe(C.hive);
    }
    // Deep teal is for a few stars only.
    const teal = [...art.pixels].filter((c) => c === C["deep-teal"]).length;
    expect(teal).toBeLessThan(40);
  });
}

test("the bee stays out of the header and the copy, whatever its frame", () => {
  const frames = beeFrames();
  expect(frames).toHaveLength(BEE.frames);
  for (const f of frames) expect([f.width, f.height]).toEqual([BEE.width, BEE.height]);
  // Sample the flight over two full loops.
  for (let i = 0; i <= 24 * MOTION.flight.period; i++) {
    const t = i / 12;
    const art = heroFrame(t);
    expect(strays(art, HEADER), `t=${t}`).toEqual([]);
    expect(strays(art, COPY), `t=${t}`).toEqual([]);
  }
});

test("the bee's box is where its pixels show, over a whole loop", () => {
  // Found from the frames themselves, not from the code that writes HERO.bee.box.
  const fps = MOTION.fps;
  const first = Math.round(MOTION.stillTime * fps);
  const found = [Infinity, Infinity, -Infinity, -Infinity];
  for (let n = first; n < first + Math.round(MOTION.flight.period * fps); n++) {
    const frame = heroFrame(n / fps);
    const ground = background(Math.floor(((n / fps) * 1000) / MOTION.twinkleMs) % 2);
    for (let y = 0; y < SCENE.height; y++) {
      for (let x = 0; x < SCENE.width; x++) {
        if (frame.get(x, y) === ground.get(x, y)) continue;
        found[0] = Math.min(found[0], x);
        found[1] = Math.min(found[1], y);
        found[2] = Math.max(found[2], x);
        found[3] = Math.max(found[3], y);
      }
    }
  }
  expect(found).toEqual(HERO.bee.box);
});

test("every layer is palette only", () => {
  for (const raster of [background(0), background(1), ...beeFrames()]) {
    for (const color of raster.colors()) expect(PALETTE.has(color), color).toBe(true);
  }
});

test("the committed still image is the frame the build draws", async () => {
  const file = decodePNG(await readFile(new URL("../site/img/hero.png", import.meta.url)));
  const still = heroFrame();
  expect([file.width, file.height]).toEqual([still.width, still.height]);
  expect(Buffer.from(file.rgba).equals(Buffer.from(still.rgba()))).toBe(true);
});

test("the loop lasts five seconds at most, and repeats exactly, so it ends on the still frame", () => {
  expect(MOTION.flight.period).toBeLessThanOrEqual(5);
  // hero.js plays loops back to back when the visitor asks, and rests where one ends: every frame
  // must come back the same a loop later, the still frame first.
  const count = Math.round(MOTION.flight.period * MOTION.fps);
  expect(count % BEE.frames, "whole cycles of the bee's frames").toBe(0);
  expect((MOTION.flight.period * 1000) % (2 * MOTION.twinkleMs), "whole cycles of the twinkle").toBe(0);
  const first = Math.round(MOTION.stillTime * MOTION.fps);
  for (let n = first; n < first + count; n++) {
    const now = heroFrame(n / MOTION.fps);
    const later = heroFrame(n / MOTION.fps + MOTION.flight.period);
    expect(Buffer.from(later.rgba()).equals(Buffer.from(now.rgba())), `frame ${n}`).toBe(true);
  }
});

test("no pixel flashes more than three times in any second (WCAG 2.3.1)", () => {
  /** @param {string | null} c */
  const luminance = (c) => {
    if (!c) return 0;
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const fps = MOTION.fps;
  const first = Math.round(MOTION.stillTime * fps);
  const count = Math.round(MOTION.flight.period * fps);
  const frames = Array.from({ length: count }, (_, k) => heroFrame((first + k) / fps).pixels.map(luminance));
  const size = frames[0].length;
  let worst = 0;
  // Every one-second window, across the loop's end too, since loops may play back to back (the
  // loop repeats exactly, see above): 13 frames, 12 changes of frame.
  for (let start = 0; start < count; start++) {
    for (let p = 0; p < size; p++) {
      let level = frames[start][p];
      let changes = 0;
      for (let k = start + 1; k <= start + fps; k++) {
        const now = frames[k % count][p];
        // A change counts when the luminance moves by 0.1 or more and the darker side is under 0.8.
        if (Math.abs(now - level) >= 0.1 && Math.min(now, level) < 0.8) {
          changes++;
          level = now;
        }
      }
      worst = Math.max(worst, changes);
    }
  }
  expect(worst, "a flash is a pair of opposing changes: at most 3 a second").toBeLessThanOrEqual(6);
});
