// @ts-check
/**
 * The wordmark, "LONE BEE" drawn pixel by pixel, and the small capitals used for words inside
 * images. Both echo Jersey 10, the site's display face: condensed, chunky, square stems, corners
 * cut in steps rather than curved. The wordmark is redrawn on a 14 px cap height (3 px stems, outer
 * curves cut in two steps, counters rounded by one pixel), so it stays crisp at every whole scale
 * where the web font cannot. Its O is a comb cell half full of honey, with the 2:1 roofs of the
 * honeycomb motif.
 */
import { bitmapFont, textRaster } from "../lib/font.js";
import { Raster } from "../lib/raster.js";
import { sprite } from "../lib/sprite.js";
import { C } from "../palette.js";

/* ---------------------------------------------------------------------------------------------
 * Wordmark
 * ------------------------------------------------------------------------------------------- */

const CAP = 14;

/**
 * "#" is ink. In the cell, the honey is lit from the upper left, like the drop shade implies: a
 * gold surface with a pollen glint ("p"), honey below, then marmalade and amber where it pools in
 * the point. The glint stands a pixel off the wall, which shades the honey's edge and would
 * otherwise swallow the glint into the wall. This is the honey of every comb cell in the brand.
 * @type {Record<string, { rows: string, top?: number }>}
 */
const GLYPHS = {
  L: {
    rows: `
      ###.....
      ###.....
      ###.....
      ###.....
      ###.....
      ###.....
      ###.....
      ###.....
      ###.....
      ###.....
      ###.....
      ########
      ########
      ########
    `,
  },
  // The cell overshoots the cap line and the baseline by a pixel: its points carry so little ink
  // that, flush, it looks smaller than the flat letters.
  cell: {
    top: -1,
    rows: `
      ......##......
      ....######....
      ..##########..
      ######..######
      ####......####
      ###........###
      ###........###
      ###........###
      ###gppggggg###
      ###hhhhhhhh###
      ###hhhhhhmm###
      ####mmmmaa####
      ######aa######
      ..##########..
      ....######....
      ......##......
    `,
  },
  O: {
    rows: `
      ..######..
      .########.
      ##########
      ####..####
      ###....###
      ###....###
      ###....###
      ###....###
      ###....###
      ###....###
      ####..####
      ##########
      .########.
      ..######..
    `,
  },
  // A steep diagonal, one column every two rows, like Jersey's N.
  N: {
    rows: `
      ####....###
      ####....###
      #####...###
      #####...###
      ######..###
      ######..###
      ###.###.###
      ###.###.###
      ###..######
      ###..######
      ###...#####
      ###...#####
      ###....####
      ###....####
    `,
  },
  // The middle bar is a row thinner than the arms, so both counters get three rows.
  E: {
    rows: `
      #########
      #########
      #########
      ###......
      ###......
      ###......
      ########.
      ########.
      ###......
      ###......
      ###......
      #########
      #########
      #########
    `,
  },
  B: {
    rows: `
      ########..
      #########.
      ##########
      ###...####
      ###....###
      ###...####
      #########.
      #########.
      ###...####
      ###....###
      ###...####
      ##########
      #########.
      ########..
    `,
  },
};

/**
 * Columns between letters, set by eye rather than by metrics: straight sides facing each other get
 * 3 (one of them taken by the shade), the B's stepped bowls too, while open or receding shapes get
 * less: the L's empty corner, the E's open counters. The word space is the narrowest that still
 * splits the two words at 1x. The cell keeps LO at 2 like the plain O: its wall meets the L's foot
 * on one row only, as close as an E's arm comes to the next E, and the L's empty corner already
 * gives that pair more air than any other pair inside a word.
 */
const KERNING = { LO: 2, ON: 3, NE: 3, "E B": 7, BE: 3, EE: 2 };

/**
 * "LONE BEE" with a 1 px drop shade down and to the right, on a transparent background. The shade
 * also falls inside the counters: in the cell it fills the apex above the honey, the well's own
 * shadow under the upper-left light, which is what gives the cell its depth.
 * @param {{ plainO?: boolean, ink?: string, shade?: string | null }} [options] plainO: a plain O
 *   instead of the honey cell, for small sizes where the cell reads as a cup; shade: null for none
 * @returns {Raster}
 */
export function wordmark({ plainO = false, ink = C.beeswax, shade = C["burnt-comb"] } = {}) {
  // A dark ink stands on a light ground, which shows through the cell above the honey. Pollen has
  // the value of beeswax: there the glint would melt into the ground and notch the honey's
  // surface, so the surface stays gold all along.
  const glint = darkInk(ink) ? C.gold : C.pollen;
  const legend = { "#": ink, p: glint, g: C.gold, h: C.honey, m: C.marmalade, a: C.amber };
  const letters = ["L", plainO ? "O" : "cell", "N", "E", "B", "E", "E"].map((name) => ({
    art: sprite(GLYPHS[name].rows, legend),
    top: GLYPHS[name].top ?? 0,
  }));
  const gaps = [KERNING.LO, KERNING.ON, KERNING.NE, KERNING["E B"], KERNING.BE, KERNING.EE];
  const capTop = Math.max(0, ...letters.map((l) => -l.top));
  const width = letters.reduce((sum, l) => sum + l.art.width, 0) + gaps.reduce((a, b) => a + b, 0);
  const height = Math.max(...letters.map((l) => capTop + l.top + l.art.height));

  const word = new Raster(width, height);
  let x = 0;
  letters.forEach((l, i) => {
    word.draw(l.art, x, capTop + l.top);
    x += l.art.width + (gaps[i] ?? 0);
  });
  if (!shade) return word;

  const silhouette = word.clone();
  silhouette.pixels = silhouette.pixels.map((c) => (c === null ? null : shade));
  return new Raster(width + 1, height + 1).draw(silhouette, 1, 1).draw(word, 0, 0);
}

/**
 * Where the letters sit inside wordmark(), for lining it up with other art: the row of the cap
 * line and of the baseline (the last row of the flat letters). The honey cell overshoots both by
 * a pixel, so with it the cap line is row 1.
 * @param {{ plainO?: boolean }} [options]
 */
export function wordmarkMetrics({ plainO = false } = {}) {
  const capTop = Math.max(0, -(GLYPHS[plainO ? "O" : "cell"].top ?? 0));
  return { capTop, capHeight: CAP, baseline: capTop + CAP - 1 };
}

/**
 * The wordmark's ink and shade for a ground: beeswax with a burnt comb shade on dark grounds, like
 * the site's title; comb black without a shade on light ones, where a dark shade would read as a
 * second, blurred stroke at small sizes.
 * @param {string | null} ground "#rrggbb", or null for the site's own dark background
 * @returns {{ ink: string, shade: string | null }}
 */
export function inkFor(ground) {
  const bg = ground ?? C.hive;
  if (contrast(C["comb-black"], bg) > contrast(C.beeswax, bg)) return { ink: C["comb-black"], shade: null };
  // Burnt comb glows warm even where it is lighter than the ground (on Hive, Night), which is the
  // title's look; it only has to stand apart from the ground, or it merely smears the letters. On
  // grounds too close to it in value, such as Bark or Slate, comb black takes over.
  const shade = [C["burnt-comb"], C["comb-black"]].find((s) => contrast(s, bg) >= 1.3) ?? null;
  return { ink: C.beeswax, shade };
}

/* ---------------------------------------------------------------------------------------------
 * Caption font
 * ------------------------------------------------------------------------------------------- */

/**
 * Small capitals, 7 px tall, for words drawn into images (link previews, banners). Strokes are one
 * pixel so they read at 1x; the family shows in the condensed widths, the corners cut by a pixel,
 * and the N's steep two-row steps. There is no row below the baseline, so the comma cannot hang
 * from it: it ends on the baseline with a two-pixel head, since a comma on the last two rows
 * alone reads as a period at 1x.
 */
export const captionFont = bitmapFont({
  spacing: 1,
  glyphs: {
    A: ".##.|#..#|#..#|####|#..#|#..#|#..#",
    B: "###.|#..#|#..#|###.|#..#|#..#|###.",
    C: ".##.|#..#|#...|#...|#...|#..#|.##.",
    D: "###.|#..#|#..#|#..#|#..#|#..#|###.",
    E: "####|#...|#...|###.|#...|#...|####",
    F: "####|#...|#...|###.|#...|#...|#...",
    G: ".##.|#..#|#...|#.##|#..#|#..#|.##.",
    H: "#..#|#..#|#..#|####|#..#|#..#|#..#",
    I: "###|.#.|.#.|.#.|.#.|.#.|###",
    J: "...#|...#|...#|...#|...#|#..#|.##.",
    K: "#..#|#..#|#.#.|##..|#.#.|#..#|#..#",
    L: "#...|#...|#...|#...|#...|#...|####",
    M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
    N: "#..#|##.#|##.#|#.##|#.##|#..#|#..#",
    O: ".##.|#..#|#..#|#..#|#..#|#..#|.##.",
    P: "###.|#..#|#..#|###.|#...|#...|#...",
    Q: ".##.|#..#|#..#|#..#|#..#|#.##|.###",
    R: "###.|#..#|#..#|###.|#.#.|#..#|#..#",
    S: ".##.|#..#|#...|.##.|...#|#..#|.##.",
    T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
    U: "#..#|#..#|#..#|#..#|#..#|#..#|.##.",
    V: "#...#|#...#|#...#|#...#|.#.#.|.#.#.|..#..",
    W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.",
    X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
    Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
    Z: "#####|....#|...#.|..#..|.#...|#....|#####",
    0: ".##.|#..#|#..#|#.##|##.#|#..#|.##.",
    1: ".#.|##.|.#.|.#.|.#.|.#.|###",
    2: ".##.|#..#|...#|..#.|.#..|#...|####",
    3: ".##.|#..#|...#|.##.|...#|#..#|.##.",
    4: "..##|.#.#|#..#|####|...#|...#|...#",
    5: "####|#...|###.|...#|...#|#..#|.##.",
    6: ".##.|#...|#...|###.|#..#|#..#|.##.",
    7: "####|...#|...#|..#.|.#..|.#..|.#..",
    8: ".##.|#..#|#..#|.##.|#..#|#..#|.##.",
    9: ".##.|#..#|#..#|.###|...#|...#|.##.",
    " ": "...|...|...|...|...|...|...",
    "·": ".|.|.|#|.|.|.",
    ".": ".|.|.|.|.|.|#",
    ",": "..|..|..|..|##|.#|#.",
    "'": "#|#|.|.|.|.|.",
    ":": ".|#|.|.|.|#|.",
    "-": "...|...|...|###|...|...|...",
    "&": ".##..|#..#.|#..#.|.##..|#.#.#|#..#.|.##.#",
    "!": "#|#|#|#|#|.|#",
    "?": ".##.|#..#|...#|..#.|.#..|....|.#..",
    "/": "...#|...#|..#.|..#.|.#..|.#..|#...",
  },
});

/**
 * Text set in the caption font, transparent around the ink. Lowercase is set as capitals, and
 * typographic quotes and dashes fall back to the font's straight ones.
 * @param {string} text
 * @param {string} [ink]
 * @returns {Raster}
 */
export function caption(text, ink = C.beeswax) {
  const plain = text.toUpperCase().replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/•/g, "·");
  return textRaster(captionFont, plain, ink);
}

/* ---------------------------------------------------------------------------------------------
 * Contrast (WCAG 2 relative luminance)
 * ------------------------------------------------------------------------------------------- */

/** @param {string} hex */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {string} a
 * @param {string} b
 */
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Whether an ink is a dark one, set on a light ground: it stands further from beeswax than from
 * comb black, the way inkFor() chooses.
 * @param {string} ink
 */
function darkInk(ink) {
  return contrast(ink, C.beeswax) > contrast(ink, C["comb-black"]);
}
