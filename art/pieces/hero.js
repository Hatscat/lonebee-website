// @ts-check
/**
 * The hero scene: golden hour on a quiet heath. The brand's bee, the logo mark itself, hovers in
 * front of the glowing sky near a sun half set behind amber hills, at the top of the dotted path it
 * flew up from a lavender spike. One small tree on a far knoll gives the scale; a few tall grasses
 * and a thistle in the near meadow rise across the horizon, backlit; the rest is air.
 *
 * The page puts its header, a bar of the same night, above the art, and its title, tagline and
 * buttons over columns 0 to 150 down to row 105, so the scene is composed to the right: the left
 * half is calm dusk sky over dark hills and a dark meadow, and everything bright (the glow, the
 * clouds, the stars that twinkle, the bee) lives in the right half. The first rows are bare night,
 * so the art continues the header without a seam; the last rows are the page background, so the
 * art melts into the page.
 *
 * Everything is drawn in the 32 palette colors, shaded by ramps with hatched strata (rows of
 * dashes) between steps, and lit by one sun, low on the right: every illustrated edge that faces
 * it takes a warm rim, everything else falls into shade. The bee is mark() relit by that sun; the
 * rest is drawn by code from hand-placed shapes, with any randomness seeded.
 */
import { contrast } from "../../scripts/tokens.js";
import { Raster } from "../lib/raster.js";
import { rng } from "../lib/rng.js";
import { sprite } from "../lib/sprite.js";
import { C } from "../palette.js";
import { twinkle } from "./bits.js";
import { mark } from "./mark.js";

const W = 300;
const H = 150;

/** @type {{ width: number, height: number, focus: [number, number] }} */
export const SCENE = { width: W, height: H, focus: [0.8, 0.5] };

/** The sun's center sits on the far crest, so half its disc shows. */
const SUN = { x: 254, y: 114, r: 9 };

/** @param {number} v @param {number} lo @param {number} hi */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Which way the sun lies from a column: 1 to the right, -1 to the left. @param {number} x */
const sunward = (x) => (x < SUN.x ? 1 : -1);

/** The palette's colors by name, so art can be read and recolored by name. */
const NAMES = [
  "comb-black", "hive", "propolis", "bark", "umber", "tawny",
  "burnt-comb", "amber", "marmalade", "honey", "gold", "pollen",
  "old-wax", "wax", "beeswax", "sunlight",
  "night", "dusk", "slate", "deep-teal", "sky", "mist", "glint",
  "moss", "grass", "sunlit-grass", "wine", "heather", "lavender", "clover", "coral", "peach",
];
/** @type {Map<string | null, string>} */
const NAME_OF = new Map(NAMES.map((n) => [C[n], n]));

/**
 * Eases between control points [x, value], flat beyond the ends.
 * @param {[number, number][]} points
 * @param {number} x
 */
function ease(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let k = 0; k + 1 < points.length; k++) {
    const [x0, v0] = points[k];
    const [x1, v1] = points[k + 1];
    if (x <= x1) return v0 + ((v1 - v0) * (1 - Math.cos((Math.PI * (x - x0)) / (x1 - x0)))) / 2;
  }
  return points[points.length - 1][1];
}

/**
 * The pixels of a clean one-pixel line, both ends included (Bresenham), so blades are even stairs
 * with no doubled pixels.
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @returns {[number, number][]}
 */
function linePoints(x0, y0, x1, y1) {
  /** @type {[number, number][]} */
  const pts = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let x = x0, y = y0; ; ) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return pts;
}

// ---------------------------------------------------------------- sky

/**
 * Hatched strata: every row is cut into dashes of varied length, each with its own threshold.
 * Where two bands meet, a dash takes the brighter band's color when its threshold is under that
 * band's share at its place, a share that grows across the edge, so bands interlock in rows of
 * horizontal dashes instead of a checkerboard. The land layers use the same dashes.
 * @param {number} seed
 */
function dashes(seed) {
  const r = rng(seed);
  const field = new Float64Array(W * H);
  for (let y = 0; y < H; y++) {
    let x = -r.int(0, 8);
    while (x < W) {
      const len = r.int(3, 12);
      const v = r.next();
      for (let i = x; i < x + len; i++) if (i >= 0 && i < W) field[y * W + i] = v;
      x += len;
    }
  }
  return field;
}

/**
 * The sky's brightness: a twilight glow that fades with height, taller and stronger toward the
 * sun's side, plus a round aureole around the sun itself. Bands are its level sets, so they bow
 * up over the sun and lie flat far from it, never concentric. Tuned so that every band brighter
 * than slate stays right of column 150 down to row 105, where the page's copy sits, while the
 * glow reaches up behind the bee.
 * @param {number} x
 * @param {number} y
 */
function glow(x, y) {
  const up = SUN.y - y;
  const dx = x - SUN.x;
  const scale = 14 + 30 * Math.exp(-((dx / 66) ** 2));
  const reach = 0.2 + 0.8 * Math.exp(-((dx / 72) ** 2));
  const r = Math.hypot(dx / 1.35, up);
  return Math.exp(-Math.max(0, up) / scale) * reach + Math.exp(-r / 17);
}

/** Sky bands from dark to bright, each from the glow level where it starts. */
const BANDS = /** @type {[string, number][]} */ ([
  ["dusk", -Infinity],
  ["slate", 0.13],
  ["sky", 0.27],
  ["peach", 0.4],
  ["honey", 0.62],
  ["gold", 0.95],
  ["pollen", 1.3],
]);

/** Half the depth of each band's hatched edge, in pixels across the edge. */
const SOFT = [0, 4, 3, 3, 3, 2.5, 1.5];

/** The night above the glow: rows over this line, with hatched strata. @param {number} x */
const nightEdge = (x) => 20.5 + 1.2 * Math.sin(x / 37 + 1) + 0.7 * Math.sin(x / 13 + 2);

/** @param {Raster} r */
function paintSky(r) {
  const dash = dashes(7);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = dash[y * W + x];
      const b = glow(x, y);
      const grad = Math.hypot(glow(x + 1, y) - glow(x - 1, y), glow(x, y + 1) - glow(x, y - 1)) / 2 || 1e-6;
      let k = 0;
      while (k + 1 < BANDS.length && b >= BANDS[k + 1][1]) k++;
      let color = BANDS[k][0];
      // Hatched strata across the nearest edge, above or below.
      for (const j of [k, k + 1]) {
        if (j < 1 || j >= BANDS.length) continue;
        const dist = (b - BANDS[j][1]) / grad; // pixels on the bright side of edge j
        if (Math.abs(dist) < SOFT[j]) color = v < 0.5 + dist / (2 * SOFT[j]) ? BANDS[j][0] : BANDS[j - 1][0];
      }
      const n = nightEdge(x);
      if (y < n - 3 || (y < n + 3 && v < (n + 3 - y) / 6)) color = "night";
      r.set(x, y, C[color]);
    }
  }
  // A dash of one pixel is noise: give it to its neighbors.
  for (let y = 0; y < H; y++) {
    for (let x = 1; x < W - 1; x++) {
      const a = r.get(x - 1, y);
      if (a === r.get(x + 1, y) && a !== r.get(x, y)) r.set(x, y, a);
    }
  }
  // The disc.
  r.ellipse(SUN.x, SUN.y, SUN.r, SUN.r, C.sunlight);
}

// ---------------------------------------------------------------- stars

/**
 * Stars: [x, y, color on frame 0, color on frame 1]. Under the header and the copy they are few,
 * dim and still, and the first eight rows are bare, so the art's top continues the header's night
 * bar without a seam or a flicker. Only the brighter stars of the glowing half, below the header,
 * twinkle.
 */
const STARS = /** @type {[number, number, string, string][]} */ ([
  [12, 9, "deep-teal", "deep-teal"],
  [41, 13, "deep-teal", "deep-teal"],
  [77, 11, "deep-teal", "deep-teal"],
  [103, 16, "slate", "slate"],
  [131, 8, "deep-teal", "deep-teal"],
  [58, 31, "slate", "slate"],
  [118, 43, "deep-teal", "deep-teal"],
  [24, 57, "slate", "slate"],
  [158, 10, "deep-teal", "deep-teal"],
  [187, 12, "deep-teal", "deep-teal"],
  [214, 8, "slate", "slate"],
  [243, 15, "deep-teal", "deep-teal"],
  [271, 9, "deep-teal", "deep-teal"],
  [293, 17, "deep-teal", "deep-teal"],
  [171, 23, "mist", "sky"],
  [199, 21, "sky", "mist"],
  [230, 22, "mist", "mist"],
  [284, 23, "sky", "mist"],
]);

/**
 * The evening star, the brightest, at the edge of the glow: the brand's twinkle (bits.js), so the
 * site has one star in two sizes. On the second frame its tips go out and it shines at the small
 * size, a glint core with mist arms.
 */
const EVENING = { x: 163, y: 36 };

/** @param {Raster} r @param {number} frame */
function paintStars(r, frame) {
  for (const [x, y, a, b] of STARS) r.set(x, y, C[frame ? b : a]);
  const star = twinkle();
  const cx = Math.floor(star.width / 2);
  const cy = Math.floor(star.height / 2);
  for (let y = 0; y < star.height; y++) {
    for (let x = 0; x < star.width; x++) {
      const color = star.get(x, y);
      const inner = Math.max(Math.abs(x - cx), Math.abs(y - cy)) <= 1;
      if (color && (frame === 0 || inner)) r.set(EVENING.x + x - cx, EVENING.y + y - cy, color);
    }
  }
}

// ---------------------------------------------------------------- clouds

/**
 * A cloud lit from below by the sun under the horizon, painted the way the light falls on it: a
 * silhouette of rounded heads over a base that hangs in billows and breaks in notches. Its crown
 * is dark where it faces away from the sun, the shoulders that fall toward the sun catch the
 * light, and the base glows, deepest under the lowest billows.
 * @typedef {{ x: number, base: number, heads: [number, number, number][], billows: [number, number, number][], notches?: [number, number, number][], lit: string[] }} Cloud
 * @param {Raster} r
 * @param {Cloud} c heads: [center x, height above the base, half-width]; billows: [from x, to x,
 *   depth below the base]; notches: [from x, to x, rows cut up into the base]; all x relative to c.x
 */
function cloud(r, { x: ox, base, heads, billows, notches = [], lit }) {
  const width = Math.max(...heads.map(([cx, , w]) => Math.floor(cx + w))) + 1;
  const top = new Array(width).fill(Infinity);
  const bottom = new Array(width).fill(-Infinity);
  const side = new Array(width).fill(0); // where the column sits across the head that crowns it, -1..1
  for (const [cx, h, w] of heads) {
    for (let x = Math.max(0, Math.ceil(cx - w)); x <= Math.floor(cx + w); x++) {
      const u = (x - cx) / w;
      const t = Math.round(base - h * Math.sqrt(Math.max(0, 1 - u * u)));
      if (t < top[x]) {
        top[x] = t;
        side[x] = u;
      }
      bottom[x] = base;
    }
  }
  for (const [a, b, d] of billows) {
    for (let x = a; x <= b; x++) {
      if (bottom[x] > -Infinity) bottom[x] = Math.max(bottom[x], base + Math.round(d * Math.sin((Math.PI * (x - a + 0.5)) / (b - a + 1)) ** 0.5));
    }
  }
  for (const [a, b, d] of notches) for (let x = a; x <= b; x++) bottom[x] = Math.min(bottom[x], base - d);
  for (let x = 0; x < width; x++) {
    if (!isFinite(top[x]) || bottom[x] < top[x]) continue;
    // The half of each head turned to the sun takes the light on its crest; the other half is the
    // dark crown. Whatever the side, the lowest rows glow from below.
    const lightSide = side[x] * (ox + x < SUN.x ? 1 : -1);
    const litRows = Math.min(lit.length, 1 + Math.max(0, bottom[x] - base));
    for (let y = top[x]; y <= bottom[x]; y++) {
      const fromTop = y - top[x];
      const fromBottom = bottom[x] - y;
      let color = "heather";
      if (fromBottom < litRows) color = lit[fromBottom];
      else if (lightSide > 0.25 && fromTop === 0) color = lightSide > 0.7 ? "coral" : "clover";
      else if (lightSide > 0.55 && fromTop === 1) color = "clover";
      else if (lightSide <= 0.25 && fromTop === 0) color = "wine";
      else if (lightSide < -0.3 && fromTop === 1) color = "wine";
      r.set(ox + x, y, C[color]);
    }
  }
}

/** Clouds, back to front, in the glowing half of the sky. */
const CLOUDS = /** @type {Cloud[]} */ ([
  // A thin shelf trailing off toward the dark side of the sky, lit only along its base.
  { x: 178, base: 39, heads: [[5, 2, 5], [14, 3, 7], [25, 2, 6], [36, 4, 8]], billows: [[8, 15, 1], [24, 36, 1]], notches: [[18, 20, 1]], lit: ["coral", "clover"] },
  // The heaped bank over the glow, its heads towering on the right.
  {
    x: 222, base: 34,
    heads: [[7, 2, 7], [19, 4, 9], [33, 6, 11], [47, 8, 12], [58, 5, 8], [68, 9, 12], [78, 6, 9]],
    billows: [[3, 9, 1], [12, 23, 1], [27, 39, 2], [45, 57, 2], [61, 77, 2]],
    notches: [[10, 11, 1], [41, 43, 1], [58, 59, 1]],
    lit: ["peach", "coral", "clover"],
  },
  // A low cumulus on the right, nearest the sun, lit gold.
  {
    x: 264, base: 55,
    heads: [[5, 2, 6], [15, 4, 9], [27, 5, 9], [34, 3, 5]],
    billows: [[2, 9, 1], [12, 22, 2], [25, 35, 1]],
    notches: [[10, 10, 1]],
    lit: ["gold", "peach", "coral"],
  },
]);

/** @param {Raster} r */
function paintClouds(r) {
  for (const c of CLOUDS) cloud(r, c);
}

// ---------------------------------------------------------------- land

/**
 * A crest line through control points, eased between them, so slopes roll and ledges stay flat.
 * Columns left of the first point are below the frame.
 * @param {[number, number][]} points
 * @returns {number[]} the top row of each column
 */
function crest(points) {
  const pts = points[0][0] > 0 ? [[0, H], [points[0][0] - 1, H], ...points] : points;
  return Array.from({ length: W }, (_, x) => Math.round(ease(/** @type {[number, number][]} */ (pts), x)));
}

/**
 * Fills a land layer from its crest down, shading it from a ramp by how much low sun reaches it:
 * the light grazes the crest and fades with depth and with distance from the sun, with the same
 * hatched strata as the sky between steps. The crest itself takes the rim color near the sun, and
 * so do the faces of steps that fall toward the sun.
 * @param {Raster} r
 * @param {number[]} top
 * @param {{ ramp: string[], reach: number, depth: number, rims?: [string, number][] }} look
 *   ramp: dark to light; reach: columns from the sun where light fades; depth: rows it reaches down;
 *   rims: [color, up to how many columns from the sun], brightest first
 * @param {Float64Array} dash
 */
function layer(r, top, { ramp, reach, depth, rims = [] }, dash) {
  for (let x = 0; x < W; x++) {
    const lightX = Math.exp(-((Math.abs(x - SUN.x) / reach) ** 2));
    for (let y = top[x]; y < H; y++) {
      const light = lightX * Math.max(0, 1 - (y - top[x]) / depth);
      const level = light * (ramp.length - 1);
      const k = Math.floor(level);
      const frac = level - k;
      const v = dash[y * W + x];
      r.set(x, y, C[ramp[Math.min(ramp.length - 1, frac > v ? k + 1 : k)]]);
    }
  }
  // A dash cut short by the crest leaves a lone pixel: give it to its neighbors.
  for (let x = 1; x < W - 1; x++) {
    for (let y = Math.max(top[x - 1], top[x], top[x + 1]) + 1; y < H; y++) {
      const left = r.get(x - 1, y);
      if (left === r.get(x + 1, y) && left !== r.get(x, y)) r.set(x, y, left);
    }
  }
  for (let x = 0; x < W; x++) {
    const rim = rims.find(([, within]) => Math.abs(x - SUN.x) <= within)?.[0];
    if (!rim) continue;
    const toward = x < SUN.x ? 1 : -1;
    const next = top[clamp(x + toward, 0, W - 1)];
    r.set(x, top[x], C[rim]);
    for (let y = top[x] + 1; y < next; y++) r.set(x, y, C[rim]);
  }
}

/**
 * Raises rounded bumps on a crest: gorse and heather bushes, so no ridge is a bare curve.
 * @param {number[]} top
 * @param {[number, number, number][]} list [x, half-width, height]
 */
function bushes(top, list) {
  for (const [bx, w, h] of list) {
    const ground = top[bx];
    for (let i = -w; i <= w; i++) {
      const x = bx + i;
      if (x < 0 || x >= W) continue;
      top[x] = Math.min(top[x], ground - Math.round(h * Math.sqrt(1 - (i / (w + 0.5)) ** 2)));
    }
  }
  return top;
}

// The land, back to front, each crest drawn by hand: the far ridge the sun sets behind, with the
// tree's knoll; a farther heather ridge; the mid hills, high and dark on the left; the near hills,
// stepping down toward the light; and the meadow's edge.
const FAR = crest([
  [140, 112], [152, 110], [165, 109], [176, 108], [186, 108], [196, 110], [206, 110], [214, 112],
  [226, 112], [236, 114], [246, 115], [260, 115], [268, 112], [274, 108], [280, 107], [288, 107],
  [294, 110], [299, 111],
]);
const FARMID = crest([
  [118, 112], [132, 110], [144, 109], [156, 112], [168, 114], [182, 115], [196, 116], [205, 116],
  [208, 118], [224, 119], [234, 119], [237, 121], [258, 122], [270, 120], [276, 117], [286, 117],
  [299, 118],
]);
const MID = bushes(crest([
  [0, 101], [10, 98], [24, 96], [36, 96], [48, 99], [60, 101], [72, 101], [80, 103], [96, 104],
  [110, 107], [124, 108], [138, 111], [152, 113], [166, 116], [182, 117], [198, 118], [212, 119],
  [215, 121], [230, 122], [243, 122], [246, 124], [262, 124], [268, 122], [274, 120], [290, 120],
  [299, 122],
]), [[17, 2, 1], [55, 3, 1], [66, 2, 1], [104, 3, 1], [145, 2, 1], [173, 3, 1], [208, 2, 1]]);
const NEAR = bushes(
  crest([
    [0, 106], [16, 104], [30, 106], [44, 109], [60, 112], [74, 113], [92, 117], [112, 119], [132, 120],
    [152, 122], [172, 124], [192, 125], [212, 127], [232, 128], [252, 129], [272, 128], [299, 126],
  ]),
  [[9, 3, 2], [38, 4, 2], [44, 2, 1], [83, 3, 2], [121, 4, 2], [127, 2, 1], [186, 3, 1], [229, 3, 1]],
);
const MEADOW = crest([
  [0, 123], [22, 122], [48, 125], [78, 128], [104, 128], [130, 131], [158, 133], [178, 132],
  [204, 134], [232, 132], [258, 131], [282, 129], [299, 130],
]);

/**
 * The lone tree on the far knoll, a heath oak in silhouette against the glow: a broad crown, wider
 * than it is tall, ragged on top, over a short trunk. It stands far enough left that phones, which
 * show columns 84 to 279, see most of its crown, and far enough from the sun to keep out of its halo.
 */
const TREE = sprite(
  `
  .....aa.a..
  ..aaaaaaaa.
  .aaaaaaaaaa
  aaaaaaaaaaa
  .aaaaaaaaa.
  ...a.aaa...
  .....a.....
  .....a.....
  `,
  { a: C["burnt-comb"] },
);
const TREE_X = 272;

/** @param {Raster} r */
function paintLand(r) {
  const dash = dashes(23);
  layer(r, FAR, { ramp: ["burnt-comb", "amber", "marmalade"], reach: 44, depth: 6, rims: [["honey", 20]] }, dash);
  layer(r, FARMID, { ramp: ["wine", "heather", "clover"], reach: 50, depth: 4, rims: [["coral", 40]] }, dash);
  layer(r, MID, { ramp: ["wine", "heather"], reach: 50, depth: 3, rims: [["clover", 36], ["heather", 95]] }, dash);
  layer(r, NEAR, { ramp: ["propolis", "bark", "umber"], reach: 50, depth: 3, rims: [["umber", 44], ["bark", 110]] }, dash);
  layer(r, MEADOW, { ramp: ["hive", "propolis"], reach: 40, depth: 3 }, dash);
  const trunk = TREE_X + 5;
  r.draw(TREE, TREE_X, FAR[trunk] - TREE.height);
}

// ---------------------------------------------------------------- meadow

/**
 * A grass tuft: blades fanning out from one root, each a clean line that leans more the taller it
 * is, the stem color below and the tip color above. Where the sun reaches, the blades that lean
 * toward it take the light on their top two or three pixels, never one: a lone lit pixel is a speck.
 * @param {Raster} r
 * @param {number} x root column
 * @param {number} y root row
 * @param {number[]} blades heights, left to right
 * @param {{ stem: string, tip: string, lit?: string }} colors
 */
function tuft(r, x, y, blades, { stem, tip, lit }) {
  const n = blades.length;
  blades.forEach((h, i) => {
    const spread = i - (n - 1) / 2;
    const pts = linePoints(x + Math.round(spread / 2), y, x + Math.round(spread * (1 + h / 6)), y - h + 1);
    // A blade under four pixels is all stem: a one-pixel tip would be a speck.
    const tipFrom = pts.length >= 4 ? Math.floor(pts.length / 2) : Infinity;
    const litFrom = lit && pts.length >= 4 && spread * sunward(x) >= 0 ? pts.length - (pts.length >= 7 ? 3 : 2) : Infinity;
    pts.forEach(([px, py], k) => r.set(px, py, C[k >= litFrom && lit ? lit : k >= tipFrom ? tip : stem]));
  });
}

/**
 * The rim along a backlit stem's sunward side, by height: dim in the meadow's shade, brighter up
 * the hills as the low light grazes it, gold in front of the far ridge. A rim is drawn only on
 * grounds dark enough for it to show; against the glowing sky the stem stays a plain dark
 * silhouette, since a rim there would vanish into the glow.
 */
const STEM_RIMS = /** @type {[number, string][]} */ ([[131, "moss"], [124, "grass"], [117, "honey"], [0, "gold"]]);
const RIM_GROUNDS = new Set(["hive", "propolis", "bark", "umber", "moss", "wine", "heather", "clover", "coral", "burnt-comb", "amber", "marmalade"]);

/**
 * A tall stem close to the eye, rooted at the bottom of the meadow and rising across the horizon:
 * one dark pixel a row, leaning with the breeze and bending a little more toward its head, rimmed
 * on its sunward side.
 * @param {Raster} r
 * @param {number} x root column
 * @param {number} root root row
 * @param {number} top tip row
 * @param {number} lean columns the tip leans right of the root
 * @returns {[number, number][]} its pixels, root first
 */
function stem(r, x, root, top, lean) {
  /** @type {[number, number][]} */
  const pts = [];
  for (let y = root; y >= top; y--) pts.push([x + Math.round(lean * ((root - y) / (root - top)) ** 1.4), y]);
  const toward = sunward(x);
  for (const [px, py] of pts.slice(3)) {
    if (!RIM_GROUNDS.has(NAME_OF.get(r.get(px + toward, py)) ?? "")) continue;
    r.set(px + toward, py, C[/** @type {[number, string]} */ (STEM_RIMS.find(([from]) => py >= from))[1]]);
  }
  for (const [px, py] of pts) r.set(px, py, C.propolis);
  return pts;
}

/**
 * Heads and leaves for the tall stems, drawn with the sun on their right ("@" is where the stem
 * joins): those right of the sun are mirrored. Against the glow they are dark silhouettes; their
 * fine hairs catch the light in pollen on the sunward side.
 */
const PARTS = {
  // A grass seed head bending toward the sun.
  plume: `
    ...r
    ..kr
    ..kr
    .kk.
    .k..
    .@..
  `,
  // Foxtail: an upright soft spike.
  spike: `
    .r
    kr
    kr
    kr
    @.
  `,
  // A thistle: a spiny bulb under a purple brush, peach where the sun catches it.
  thistle: `
    .llv.
    .lllv
    k.k.k
    .kkk.
    .kkk.
    ..@..
  `,
  // The thistle's spiny leaves, one each way.
  leafLeft: `
    k...k.
    .kkkk@
    ..k...
  `,
  leafRight: `
    .k...k
    @kkkk.
    ...k..
  `,
};
const PART_LEGEND = { k: C.propolis, r: C.pollen, l: C.lavender, v: C.peach };

/**
 * @param {Raster} r
 * @param {keyof typeof PARTS} name
 * @param {[number, number]} at where its "@" goes
 */
function part(r, name, [x, y]) {
  const lines = PARTS[name].split("\n").filter((line) => line.trim() !== "").map((line) => line.trim());
  const ay = lines.findIndex((line) => line.includes("@"));
  const ax = lines[ay].indexOf("@");
  const s = sprite(lines.join("\n").replace("@", "k"), PART_LEGEND);
  const flip = sunward(x) < 0;
  r.draw(s, x - (flip ? s.width - 1 - ax : ax), y - ay, { flipX: flip });
}

/**
 * The tall plants, left to right: [root x, root row, tip row, lean, head]. They all lean the same
 * way, with the breeze: a foxtail, a clump of three grasses, and a thistle by the sun. None
 * crosses the sun's disc, and none rises near the bee.
 */
const STEMS = /** @type {[number, number, number, number, keyof typeof PARTS][]} */ ([
  [203, 142, 117, 2, "spike"],
  [214, 143, 110, 1, "spike"],
  [217, 143, 103, 5, "plume"],
  [221, 142, 112, 6, "plume"],
  [235, 142, 111, 3, "thistle"],
]);

/**
 * A clump of long blades close to the eye: dark, rooted at the bottom of the meadow, rimmed on
 * the sunward side of their upper two thirds, in moss in the shade and grass nearer the sun.
 * @param {Raster} r
 * @param {number} x root column
 * @param {number} y root row
 * @param {[number, number][]} blades [height, lean in columns], left to right
 * @param {string} rim
 */
function clump(r, x, y, blades, rim) {
  const toward = sunward(x);
  blades.forEach(([h, lean], i) => {
    const x0 = x + i - Math.floor(blades.length / 2);
    const pts = linePoints(x0, y, x0 + lean, y - h + 1);
    pts.forEach(([px, py], k) => {
      if (k >= pts.length / 3) r.set(px + toward, py, C[rim]);
    });
    for (const [px, py] of pts) r.set(px, py, C.hive);
  });
}

/** @param {Raster} r */
function paintMeadow(r) {
  const g = rng(11);
  // The meadow's edge: groups of small tufts with bare ground between, moss in the shade on the
  // left, grass tipped with light toward the sun.
  for (const [cx, n] of /** @type {[number, number][]} */ ([
    [6, 3], [24, 1], [63, 2], [72, 1], [106, 2], [134, 1], [145, 2], [156, 2], [190, 3], [209, 2],
    [228, 3], [246, 2], [262, 2], [281, 3],
  ])) {
    for (let i = 0; i < n; i++) {
      const x = cx + g.int(-5, 5);
      const d = Math.abs(x - SUN.x);
      const blades = x < 150 ? Array.from({ length: g.int(2, 3) }, () => g.int(3, 5)) : Array.from({ length: g.int(3, 4) }, () => g.int(2, 5));
      tuft(r, x, MEADOW[clamp(x, 0, W - 1)] + g.int(0, 1), blades, {
        stem: "moss",
        tip: x < 150 ? "moss" : "grass",
        lit: x > 170 && d < 100 ? "sunlit-grass" : undefined,
      });
    }
  }
  paintFlowers(r);
  // The middle distance: a few larger clumps with bare gaps between.
  for (const [x, y, blades] of /** @type {[number, number, number[]][]} */ ([
    [176, 137, [4, 7, 5]], [195, 138, [5, 9, 11, 6]], [231, 136, [3, 6, 4]], [251, 139, [6, 10, 8, 5]],
    [279, 137, [4, 8, 6]],
  ])) {
    tuft(r, x, y, blades, { stem: "moss", tip: "grass", lit: Math.abs(x - SUN.x) < 90 ? "sunlit-grass" : undefined });
  }
  // Close to the eye: dark clumps along the bottom, the tall plants rising among them.
  clump(r, 14, 143, [[7, -2], [11, -1], [9, 1], [6, 2]], "moss");
  clump(r, 57, 143, [[5, -1], [8, 0], [6, 2]], "moss");
  for (const [x, root, top, lean, name] of STEMS) {
    const pts = stem(r, x, root, top, lean);
    part(r, name, pts[pts.length - 1]);
    if (name === "thistle") {
      part(r, "leafLeft", pts[14]);
      part(r, "leafRight", pts[20]);
    }
  }
  clump(r, 210, 143, [[6, -2], [9, -1], [7, 1]], "grass");
  clump(r, 226, 143, [[8, 1], [11, 2], [6, 3]], "grass");
  clump(r, 258, 143, [[7, 1], [10, -1], [6, -2]], "grass");
  // Long blades close by in the glow, framing the right corner, each with a lit edge.
  for (const [x, h, bend, rim] of /** @type {[number, number, number, string][]} */ ([
    [291, 22, -4, "sunlit-grass"], [295, 30, -6, "sunlit-grass"], [298, 19, -2, "grass"],
  ])) {
    blade(r, x, h, bend, rim);
  }
}

/**
 * A long grass blade close to the eye, bending over: dark, two pixels wide near its root, with an
 * edge of light on the side that faces the sun when it stands in the glow.
 * @param {Raster} r
 * @param {number} x root column
 * @param {number} h
 * @param {number} bend columns its tip leans over, signed
 * @param {string} rim
 */
function blade(r, x, h, bend, rim) {
  const y = H - 7;
  const toward = sunward(x);
  for (let j = 0; j < h; j++) {
    const t = j / (h - 1);
    const px = x + Math.round(bend * t * t);
    r.set(px, y - j, C[t < 0.5 ? "hive" : "propolis"]);
    if (t < 0.35) r.set(px - toward, y - j, C.hive);
    else if (t > 0.45) r.set(px + toward, y - j, C[rim]);
  }
}

// ---------------------------------------------------------------- flowers

/**
 * Sprites of the meadow's flowers, lit from behind by the low sun, drawn with the sun on their
 * right: those right of the sun are drawn mirrored, so their lit side always faces it.
 */
const FLOWER_LEGEND = {
  l: C.lavender, h: C.heather, w: C.wine, m: C.moss, g: C.grass, c: C.clover, u: C.coral, v: C.peach,
  o: C["old-wax"], x: C.wax, y: C.beeswax, z: C.sunlight,
};
const FLOWER = {
  // Lavender: three spikes of whorled florets, warm light catching their sunward side.
  lavender: sprite(
    `
    ....l.....
    ...hl.....
    ...lv..l..
    ...hl.hl..
    .l.lv.lv..
    hl.hl.hl..
    lv..m.lv..
    hl..m.hl..
    .m..m..m..
    .m..m..m..
    ..m.m.m...
    ..m.m.m...
    ...mmm....
    `,
    FLOWER_LEGEND,
  ),
  // A single lavender spike, farther off.
  spike: sprite(
    `
    .l.
    hl.
    lv.
    hl.
    .m.
    .m.
    .m.
    `,
    FLOWER_LEGEND,
  ),
  // Red clover: a domed head of florets, a few tips standing above it, lit coral and peach only
  // along the edge that faces the sun; a trefoil below.
  clover: sprite(
    `
    .c.u.
    hcccu
    hcccv
    .hhc.
    ..m..
    gm.m.
    .gmg.
    ..m..
    `,
    FLOWER_LEGEND,
  ),
  // A red clover close by, larger: florets standing up around the dome's crown.
  bigClover: sprite(
    `
    ..c.c.u.
    .hcccccu
    hhcccccv
    hhcccccv
    .hhcccu.
    ..hhhh..
    ....m...
    .gm.m.mg
    ..gmmmg.
    ....m...
    ....m...
    `,
    FLOWER_LEGEND,
  ),
  // Heather: a woody sprig hung with bells.
  heather: sprite(
    `
    ...c...
    ..hcl..
    .h.m.c.
    hc.m.hc
    .m.mh..
    ..mm...
    ...m...
    `,
    FLOWER_LEGEND,
  ),
  // A dandelion clock against the light: a sparse, ragged sphere of seeds with the hills showing
  // through, brightest on the arc that faces the sun, its stem joining at the bottom. No hub.
  dandelion: sprite(
    `
    ....x.y..
    .o..o..z.
    x.......y
    ...o..x..
    o.......z
    .x..o..y.
    ...o.z...
    ....m....
    ....m....
    ....m....
    ....m....
    ....m....
    ...m.....
    ...m.....
    ...m.....
    ...m.....
    ...m.....
    ...m.....
    `,
    FLOWER_LEGEND,
  ),
};

/** Where the flowers grow, in patches: [sprite, x, rows below the meadow's edge]. Nearer ones sit lower. */
const FLOWERS = /** @type {[keyof typeof FLOWER, number, number][]} */ ([
  // the lavender patch the bee rose from
  ["spike", 158, 1], ["spike", 175, 2], ["lavender", 167, 4], ["spike", 182, 3],
  // clover and heather toward the light
  ["clover", 205, 3], ["heather", 214, 2], ["clover", 226, 7], ["heather", 249, 2], ["clover", 259, 5],
  // nearer, so larger
  ["bigClover", 245, 10],
  // the dandelion clock against the glow, and a last spike
  ["dandelion", 276, 6], ["spike", 286, 1],
]);

/** The lavender the bee rose from: the top of its middle spike, where the dotted path starts. */
const FROM = (() => {
  const [, x, dy] = /** @type {[string, number, number]} */ (FLOWERS.find(([name]) => name === "lavender"));
  const spike = 4; // the middle spike's column in the sprite
  return { x: x - Math.floor(FLOWER.lavender.width / 2) + spike, y: MEADOW[x] + dy - FLOWER.lavender.height + 1 };
})();

/** @param {Raster} r */
function paintFlowers(r) {
  for (const [name, x, dy] of FLOWERS) {
    const s = FLOWER[name];
    r.draw(s, x - Math.floor(s.width / 2), MEADOW[x] + dy - s.height + 1, { flipX: x > SUN.x });
  }
}

// ---------------------------------------------------------------- the flight path

/**
 * The way the bee came, as cubic Bézier segments [p0, p1, p2, p3]: a lazy S from the lavender it
 * left up to where it hovers now. It leaves the flower up and to the left, bows out over the dark
 * hills and the dusk, then sweeps up to the right and comes in level behind the bee's tail. Its
 * lower bend stays left of the teal band of the glow, where the middle of the fade would vanish,
 * and right of column 150, where the page's copy sits.
 */
function pathCurve() {
  const [sx, sy] = [FROM.x, FROM.y - 2];
  const [cx, cy] = MOTION.flight.center;
  // A few pixels behind the tip of the abdomen, at the still.
  const [ex, ey] = [cx - 23, cy + 4];
  return /** @type {[number, number][][]} */ ([
    [[sx, sy], [sx - 9, sy - 7], [sx - 13, sy - 19], [sx - 6, sy - 27]],
    [[sx - 6, sy - 27], [sx + 1, sy - 35], [sx + 14, sy - 33], [sx + 17, sy - 41]],
    [[sx + 17, sy - 41], [ex - 8, ey + 5], [ex - 5, ey], [ex, ey]],
  ]);
}

/** The path fades by age, the oldest dot first: never burnt comb, which vanishes on the far ridge. */
const PATH_FADE = ["amber", "marmalade", "honey", "gold"];

/**
 * The dotted path of the bee's flight, one dot every 3.5 pixels along the curve, fading from gold
 * near the bee to amber at the flower, the way a trail of scent fades. A dot that would not stand
 * out from what lies under it (1.8:1) takes the next step of the fade that does, and the fade
 * never steps back.
 * @param {Raster} r
 */
function paintPath(r) {
  /** @type {number[][]} */
  const dots = [];
  const segments = pathCurve();
  let run = 3.5;
  let last = segments[0][0];
  for (const [p0, p1, p2, p3] of segments) {
    for (let i = 1; i <= 400; i++) {
      const t = i / 400;
      const u = 1 - t;
      const p = [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
      run += Math.hypot(p[0] - last[0], p[1] - last[1]);
      last = p;
      if (run >= 3.5) {
        dots.push(p);
        run = 0;
      }
    }
  }
  // On the pixel grid, the nearest pixel to each point can leave gaps of 2.8 or 4.5 pixels: a dot
  // may move to another pixel within one of the curve when that keeps its gap between 3 and 4.2.
  /** @type {[number, number][]} */
  const placed = [];
  for (const [fx, fy] of dots) {
    const prev = placed[placed.length - 1];
    /** @type {[number, number][]} */
    const near = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const [x, y] = [Math.round(fx) + dx, Math.round(fy) + dy];
        if (Math.hypot(x - fx, y - fy) <= 1) near.push([x, y]);
      }
    }
    const off = (/** @type {[number, number]} */ [x, y]) => Math.hypot(x - fx, y - fy);
    const gap = (/** @type {[number, number]} */ [x, y]) => (prev ? Math.hypot(x - prev[0], y - prev[1]) : 3.5);
    near.sort((a, b) => off(a) - off(b));
    placed.push(near.find((p) => gap(p) >= 3 && gap(p) <= 4.2) ?? near[0]);
  }
  let step = 0;
  placed.forEach(([x, y], i) => {
    const ground = r.get(x, y) ?? C.dusk;
    const want = Math.max(step, Math.floor((i * PATH_FADE.length) / placed.length));
    const shows = PATH_FADE.findIndex((name, k) => k >= want && contrast(C[name], ground) >= 1.8);
    step = shows < 0 ? want : shows;
    r.set(x, y, C[PATH_FADE[step]]);
  });
}

// ---------------------------------------------------------------- the scene

/**
 * The whole scene without the bee. Frames 0 and 1 differ only by a few stars.
 * @param {number} [frame]
 */
export function background(frame = 0) {
  const r = new Raster(W, H, C.night);
  paintSky(r);
  paintStars(r, frame);
  paintClouds(r);
  paintLand(r);
  paintMeadow(r);
  paintPath(r);
  // The last rows are the page's own background.
  for (let y = H - 6; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, C.hive);
  return r;
}

// ---------------------------------------------------------------- the bee

/*
 * The scene's bee is the logo mark's bee: mark(), pixel for pixel, relit for the scene. The mark
 * is lit from the upper right; here the low sun shines from the lower right and from behind, so
 * the body falls into shade (its gold bands deepen to burnt comb and amber, its dark bands to
 * propolis), the edges that face the sun take a warm rim, and the wings, lit through, glow.
 *
 * Only colors change: the body is the mark's silhouette and anatomy, its pattern read from the
 * mark's colors, so an edit of the mark reaches the hero. The light is a recoloring by name, a few
 * hand-placed pixels (the backlit thorax, the rims, the eye, the pollen load), and two more wing
 * poses drawn over the same body.
 */

/** The mark's colors in the scene's light, by name: its top light flattened into shade. */
const SHADE = /** @type {Record<string, string>} */ ({
  pollen: "burnt-comb", gold: "burnt-comb", honey: "burnt-comb", marmalade: "amber", amber: "marmalade",
  "burnt-comb": "amber", wine: "propolis", bark: "propolis", umber: "bark", tawny: "bark",
  "comb-black": "comb-black", "deep-teal": "gold", slate: "comb-black", glint: "slate",
});

/** Colors of the hand-placed pixels, one character each. */
const BEE_LEGEND = {
  "0": C["comb-black"], "2": C.propolis, "3": C.bark, a: C["burnt-comb"], b: C.amber, c: C.marmalade,
  d: C.honey, e: C.gold, f: C.pollen, p: C.slate, v: C.peach,
};

/**
 * The light, painted by hand over the recolored body ("." keeps the recolored pixel), only ever
 * on pixels the mark draws: the thorax dark at the top and back, its hair glowing amber to gold
 * toward the sun; every top edge in propolis, which stands out from the slate sky where burnt comb
 * would vanish; the legs and antenna as dark lines, only the antenna's tip catching the light; the
 * pollen load glowing on its sunward side; the brightest rim where the belly and the face turn to
 * the sun; the eye a dark kidney with the slate sky on its top and one warm glint low in front.
 */
const BACKLIGHT = `
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  .............................2..
  ............................2.2.
  ............................2.b.
  ...................2.2.222.2...d
  .................233aa22.p22....
  ..........2222..233aab...pd.....
  .......222....2.23aabb...0e.....
  .....22.........2aabbc....e.....
  ...22...........3abcde....f.....
  ..2..............bdee....ve.....
  .2...............222.2....d.....
  ..dd.........f..22.22.2.........
  ........ff.....22..2...2........
  ............ce2...2....2........
  ...........bce....2.....2.......
  ...........bcf...2..............
  ............2...................
  ............2...................
  ...........2....................
`;

const COOL = new Set(["dusk", "slate", "deep-teal", "sky", "mist", "glint"]);

/**
 * The raised wings, from the mark's own wing pixels: the near forewing's cells glow pollen like
 * lit glass, its costa takes the sun, its radius vein shows honey against the light and its other
 * veins and margin gold; the far forewing is a step dimmer, gold with honey veins; the hindwing
 * under them is peach.
 */
const RAISED = /** @type {Record<"near" | "far" | "hind", Record<string, string>>} */ ({
  near: { slate: "pollen", mist: "sunlight", glint: "sunlight", "deep-teal": "gold", radius: "honey", seam: "honey" },
  far: { dusk: "gold", slate: "honey", "deep-teal": "honey", sky: "pollen" },
  hind: { dusk: "peach", "deep-teal": "honey" },
});

/**
 * The near forewing laid back level, over the same body: the costa on top in 1:6 steps, one honey
 * vein, pollen cells, a gold trailing edge bowed out in peach under its outer half, and a round
 * tip. The far wing hides behind it.
 */
const LEVEL = `
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  .....zzzzzz.....................
  ....effffffzzzzzz...............
  ....effddddddffffzzz............
  .....effffffffeeeee.............
  ......vvvv......................
`;

/**
 * The near forewing lowered, laid back and down across the abdomen: a pollen costa in an even 2:1
 * stair from the root to the tip, and a honey trailing edge. In front of the body the wing is in
 * the body's own shadow, a veil ("+") that lifts each pixel one step, and it ends inside the
 * belly's rim, which stays whole.
 */
const LOWERED = `
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ................................
  ..................f.............
  ................ff+.............
  ..............ff+++.............
  ............ff++++..............
  ..........ff++++dd..............
  ........ff++++dd................
  ......ff++++dd..................
  .....f++++dd....................
  ....f+++dd......................
`;

/**
 * A wing's veil over the shaded body: the little light it scatters lifts the dark colors a step
 * and leaves the bright ones as they are, so the stripes still show through it.
 */
const VEIL = /** @type {Record<string, string>} */ ({
  "comb-black": "hive", hive: "propolis", propolis: "bark", wine: "bark", bark: "umber", umber: "tawny",
  "burnt-comb": "amber", gold: "pollen",
});

/** @param {string} text @returns {string[]} rows of a pixel grid, indentation removed */
function rows(text) {
  return text.split("\n").filter((line) => line.trim() !== "").map((line) => line.trim());
}

/**
 * The bee's body in the scene's light, and the mark's wing pixels sorted into the three wings.
 * @returns {{ body: Raster, wings: { x: number, y: number, wing: "near" | "far" | "hind", role: string }[] }}
 */
function relit() {
  const m = mark();
  const name = (/** @type {number} */ x, /** @type {number} */ y) => NAME_OF.get(m.get(x, y)) ?? "";
  const isWing = (/** @type {number} */ x, /** @type {number} */ y) => y <= 12 && COOL.has(name(x, y));
  const body = new Raster(m.width, m.height);
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const n = name(x, y);
      if (n && !isWing(x, y)) body.set(x, y, C[SHADE[n] ?? n]);
    }
  }
  rows(BACKLIGHT).forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== "." && body.get(x, y)) body.set(x, y, BEE_LEGEND[/** @type {keyof typeof BEE_LEGEND} */ (ch)]);
    });
  });
  // The costa, the near forewing's leading edge, is the line of mist (and its glint) on each row:
  // what lies right of it is the far forewing, the dusk lobe left of it the hindwing.
  /** @type {Map<number, number>} */
  const costa = new Map();
  let firstCosta = Infinity;
  for (let y = 0; y <= 12; y++) {
    for (let x = 0; x < m.width; x++) {
      if (isWing(x, y) && (name(x, y) === "mist" || name(x, y) === "glint")) {
        costa.set(y, Math.max(costa.get(y) ?? -1, x));
        firstCosta = Math.min(firstCosta, y);
      }
    }
  }
  const near4 = (/** @type {number} */ x, /** @type {number} */ y, /** @type {string[]} */ names) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWing(x + dx, y + dy) && names.includes(name(x + dx, y + dy)));
  const wings = [];
  for (let y = 0; y <= 12; y++) {
    for (let x = 0; x < m.width; x++) {
      if (!isWing(x, y)) continue;
      const n = name(x, y);
      const cx = costa.get(y);
      /** @type {"near" | "far" | "hind"} */
      let wing = "near";
      let role = n;
      if ((cx !== undefined && x > cx) || y < firstCosta) wing = "far";
      else if (n === "dusk") wing = "hind";
      else if (n === "deep-teal") {
        // The radius runs one pixel inside the costa; a vein beside a cell is the near wing's, and
        // a seam where it meets the hindwing; any other edge is the hindwing's.
        if (cx !== undefined && x === cx - 1) role = "radius";
        else if (near4(x, y, ["slate", "mist", "glint"])) role = near4(x, y, ["dusk"]) ? "seam" : "deep-teal";
        else wing = "hind";
      }
      wings.push({ x, y, wing, role });
    }
  }
  return { body, wings };
}

/**
 * Draws a wing pose over the body: letters are wing colors, "+" the veil over the body (gold where
 * the wing is in the open, still in the body's shade); over the body a costa stays pollen and an
 * edge stays honey.
 * @param {Raster} body
 * @param {string} text
 */
function pose(body, text) {
  const out = body.clone();
  const legend = /** @type {Record<string, string>} */ ({ z: "sunlight", f: "pollen", e: "gold", d: "honey", v: "peach" });
  rows(text).forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const under = NAME_OF.get(body.get(x, y));
      if (ch === "+") out.set(x, y, C[under ? (VEIL[under] ?? under) : "gold"]);
      else out.set(x, y, C[legend[ch]]);
    });
  });
  return out;
}

/**
 * The hover, drawn into the bee's frames rather than left to flight.js: one small figure-eight per
 * loop (the shape of a honeybee's waggle dance), and a full wingbeat, raised, level, lowered,
 * level, that sweeps down and back up instead of snapping. Both step together on every other frame
 * only, as the stars' twinkle steps on whole seconds, so no pixel of the scene can change more than
 * six times a second, three flashes at most (WCAG 2.3.1), however fine the wings' veins. The wings
 * beat one and a half times a second: the calm of a bee holding still in the air.
 * radius: half the figure-eight's width and height, in pixels; stroke: the wings' poses in turn.
 */
const HOVER = { radius: /** @type {[number, number]} */ ([4, 2]), stroke: /** @type {const} */ (["raised", "level", "lowered", "level"]) };

/** The scene's frame rate, the brand's: a game's, not a film's. */
const FPS = 12;

/** Frames of the 4 second loop: each pose and place is held for two. */
const LOOP_FRAMES = 4 * FPS;

/**
 * The bee sprite: its size, with room for the hover around the mark's 32 × 32; the pixel placed on
 * the flight position (the thorax, at the center of the hover); its frames, one per frame of the
 * loop.
 */
export const BEE = {
  width: 32 + 2 * HOVER.radius[0],
  height: 32 + 2 * HOVER.radius[1],
  anchor: /** @type {[number, number]} */ ([19 + HOVER.radius[0], 16 + HOVER.radius[1]]),
  frames: LOOP_FRAMES,
};

/**
 * The bee's frames, facing right, one per frame of the loop. The first is the still: the mark's
 * own raised pose at the center of the hover.
 */
export function beeFrames() {
  const { body, wings } = relit();
  const raised = body.clone();
  for (const { x, y, wing, role } of wings) raised.set(x, y, C[RAISED[wing][role] ?? RAISED[wing]["deep-teal"]]);
  const poses = { raised, level: pose(body, LEVEL), lowered: pose(body, LOWERED) };
  const steps = LOOP_FRAMES / 2;
  return Array.from({ length: LOOP_FRAMES }, (_, n) => {
    const step = Math.floor(n / 2);
    const a = (2 * Math.PI * step) / steps;
    const dx = Math.round(HOVER.radius[0] * Math.sin(a));
    const dy = Math.round(HOVER.radius[1] * Math.sin(2 * a));
    return new Raster(BEE.width, BEE.height).draw(poses[HOVER.stroke[step % HOVER.stroke.length]], HOVER.radius[0] + dx, HOVER.radius[1] + dy);
  });
}

/**
 * How the scene moves, for site/js/flight.js: 12 frames a second and a slow twinkle. The bee's
 * hover is in its frames, so its flight holds still at the center of the loop and needs no bob;
 * it keeps facing the sun, so its backlight stays true. Its trail is drawn into the background,
 * so no trail is drawn at run time. The loop lasts 4 seconds (48 frames: whole numbers of
 * wingbeats and twinkles) and starts and ends on the still image: the bee at the center of its
 * hover, wings raised.
 */
export const MOTION = {
  fps: FPS,
  twinkleMs: 1000,
  flight: {
    center: /** @type {[number, number]} */ ([216, 67]),
    radius: /** @type {[number, number]} */ ([0, 0]),
    period: LOOP_FRAMES / FPS,
    bob: 0,
    bobPeriod: 0.5,
    turns: false,
  },
  trail: null,
  stillTime: 0,
};
