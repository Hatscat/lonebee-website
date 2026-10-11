// @ts-check
import { expect, test } from "@playwright/test";
import { bitmapFont, textRaster, textWidth } from "../art/lib/font.js";
import { decodeICO, encodeICO } from "../art/lib/ico.js";
import { decodePNG, encodePNG } from "../art/lib/png.js";
import { Raster } from "../art/lib/raster.js";
import { rng } from "../art/lib/rng.js";
import { sprite, spriteText } from "../art/lib/sprite.js";
import { svgOf } from "../art/lib/svg.js";

/** @param {number} width @param {number} height @param {number} colors @param {number} seed */
function randomImage(width, height, colors, seed) {
  const random = rng(seed);
  const palette = Array.from({ length: colors }, () => [random.int(0, 255), random.int(0, 255), random.int(0, 255), random.pick([0, 255, 128])]);
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const c = random.pick(palette);
    rgba.set(c[3] === 0 ? [0, 0, 0, 0] : c, i * 4);
  }
  return rgba;
}

test.describe("PNG", () => {
  for (const colors of [1, 2, 3, 4, 5, 16, 17, 256, 400]) {
    test(`round trip with ${colors} colors`, () => {
      // Odd sizes exercise the bit packing at the end of each row; past 256 colors, the image must
      // be large enough to really use them all, which takes the RGBA path.
      const [w, h] = colors > 256 ? [61, 47] : [13, 7];
      const rgba = randomImage(w, h, colors, colors);
      const decoded = decodePNG(encodePNG(w, h, rgba));
      expect(decoded.width).toBe(w);
      expect(decoded.height).toBe(h);
      expect(Buffer.from(decoded.rgba).equals(Buffer.from(rgba))).toBe(true);
    });
  }

  test("indexed at the smallest bit depth, RGBA past 256 colors", () => {
    /** @param {Buffer} png */
    const header = (png) => ({ bitDepth: png[24], colorType: png[25] });
    expect(header(encodePNG(4, 4, randomImage(4, 4, 2, 1)))).toEqual({ bitDepth: 1, colorType: 3 });
    expect(header(encodePNG(9, 9, randomImage(9, 9, 16, 2)))).toEqual({ bitDepth: 4, colorType: 3 });
    expect(header(encodePNG(32, 32, randomImage(32, 32, 200, 3)))).toEqual({ bitDepth: 8, colorType: 3 });
    expect(header(encodePNG(32, 32, randomImage(32, 32, 1000, 4)))).toEqual({ bitDepth: 8, colorType: 6 });
  });

  test("the same pixels always give the same bytes", () => {
    const rgba = randomImage(20, 20, 12, 9);
    expect(encodePNG(20, 20, rgba).equals(encodePNG(20, 20, rgba))).toBe(true);
  });

  test("rejects a buffer of the wrong size", () => {
    expect(() => encodePNG(2, 2, new Uint8Array(15))).toThrow(/bytes/);
  });
});

test("ICO keeps its frames and sizes", () => {
  const frames = [16, 32, 48].map((size) => ({ size, png: new Raster(size, size, "#112233").png() }));
  const decoded = decodeICO(encodeICO(frames));
  expect(decoded.map((f) => f.size)).toEqual([16, 32, 48]);
  decoded.forEach((f, i) => expect(f.png.equals(frames[i].png)).toBe(true));
  expect(() => encodeICO([{ size: 16, png: new Raster(8, 8, "#000000").png() }])).toThrow(/not 16×16/);
});

test.describe("Raster", () => {
  test("rejects colors that are not #rrggbb", () => {
    const r = new Raster(2, 2);
    expect(() => r.set(0, 0, "#FFF")).toThrow(/bad color/);
    expect(() => r.set(0, 0, "red")).toThrow(/bad color/);
  });

  test("lines include both ends and stay one pixel wide", () => {
    const r = new Raster(8, 8).line(0, 0, 7, 3, "#ffffff");
    expect(r.get(0, 0)).toBe("#ffffff");
    expect(r.get(7, 3)).toBe("#ffffff");
    expect([...r.pixels].filter(Boolean).length).toBe(8);
  });

  test("ellipses and circles are symmetric", () => {
    const r = new Raster(21, 15).ellipse(10, 7, 8, 5, "#ffffff");
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 21; x++) {
        expect(r.get(x, y)).toBe(r.get(20 - x, y));
        expect(r.get(x, y)).toBe(r.get(x, 14 - y));
      }
    }
  });

  test("dither shares paint the expected number of pixels", () => {
    for (const share of [0, 4, 8, 12, 16]) {
      const r = new Raster(8, 8).dither(0, 0, 8, 8, "#000000", "#ffffff", () => share);
      expect(r.pixels.filter((c) => c === "#ffffff").length).toBe(share * 4);
    }
  });

  test("scale enlarges by whole factors only", () => {
    const r = sprite("ab|ba".replace("|", "\n"), { a: "#000000", b: "#ffffff" }).scale(3);
    expect([r.width, r.height]).toEqual([6, 6]);
    expect(r.get(2, 2)).toBe("#000000");
    expect(r.get(3, 0)).toBe("#ffffff");
    expect(() => r.scale(1.5)).toThrow(/whole factor/);
  });

  test("draw keeps the destination under transparent pixels, and flips", () => {
    const dst = new Raster(3, 1, "#000000");
    dst.draw(sprite("a.b", { a: "#ff0000", b: "#00ff00" }), 0, 0, { flipX: true });
    expect(dst.pixels).toEqual(["#00ff00", "#000000", "#ff0000"]);
  });
});

test.describe("sprites", () => {
  const legend = { k: "#000000", w: "#ffffff" };
  test("parse and print back", () => {
    const text = "k.w\nwwk";
    expect(spriteText(sprite(text, legend), legend)).toBe(text);
  });
  test("indentation and blank lines are ignored", () => {
    expect(spriteText(sprite("\n    k.\n    .w\n  ", legend), legend)).toBe("k.\n.w");
  });
  test("unknown characters and ragged rows fail", () => {
    expect(() => sprite("kx", legend)).toThrow(/not in the legend/);
    expect(() => sprite("kk\nk", legend)).toThrow(/wide/);
  });
});

test("SVG covers exactly the opaque pixels", () => {
  const random = rng(5);
  const r = new Raster(17, 11);
  for (let i = 0; i < r.pixels.length; i++) r.pixels[i] = random.pick([null, "#000000", "#ffffff", "#ff0000"]);
  const svg = svgOf(r, { scale: 2 });
  expect(svg).toContain('viewBox="0 0 17 11" width="34" height="22"');
  // Paint the SVG's rectangles back into a raster, and compare.
  const back = new Raster(17, 11);
  for (const [, color, d] of svg.matchAll(/<path fill="(#[0-9a-f]{6})" d="([^"]+)"\/>/g)) {
    for (const [, x, y, w, h] of d.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)) {
      for (let j = 0; j < Number(h); j++) {
        for (let i = 0; i < Number(w); i++) {
          expect(back.get(Number(x) + i, Number(y) + j)).toBeNull(); // no overlap
          back.set(Number(x) + i, Number(y) + j, color);
        }
      }
    }
  }
  expect(back.pixels).toEqual(r.pixels);
});

test("bitmap fonts measure and draw", () => {
  const font = bitmapFont({ spacing: 1, glyphs: { I: "#|#|#", L: "#.|#.|##" } });
  expect(font.height).toBe(3);
  expect(textWidth(font, "LIL")).toBe(2 + 1 + 1 + 1 + 2);
  const r = textRaster(font, "IL", "#ffffff");
  expect(spriteText(r, { w: "#ffffff" })).toBe("w.w.\nw.w.\nw.ww");
  expect(() => textWidth(font, "X")).toThrow(/no glyph/);
});

test("the random generator is deterministic", () => {
  const a = rng(42);
  const b = rng(42);
  for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  const c = rng(7);
  for (let i = 0; i < 1000; i++) {
    const n = c.int(3, 5);
    expect(n >= 3 && n <= 5).toBe(true);
  }
});
