// @ts-check
/**
 * The small art of the site: the 404 page's lone flower at dusk, the teaser tiles of the games in
 * the works, the honeycomb cell beside section titles, and the twinkle that marks list items.
 * Every function returns a new Raster in palette colors only.
 */
import { bitmapFont, drawText } from "../lib/font.js";
import { Raster } from "../lib/raster.js";
import { rng } from "../lib/rng.js";
import { sprite } from "../lib/sprite.js";
import { C } from "../palette.js";

/* ---------------------------------------------------------------------------------------------
 * Twinkle
 * ------------------------------------------------------------------------------------------- */

/** A 5×5 star: a glint core, mist arms fading to deep teal. */
export function twinkle() {
  return sprite(
    `
    ..d..
    ..m..
    dmgmd
    ..m..
    ..d..
    `,
    { d: C["deep-teal"], m: C.mist, g: C.glint },
  );
}

/* ---------------------------------------------------------------------------------------------
 * Comb cell
 * ------------------------------------------------------------------------------------------- */

/**
 * Pointy-top cells with 2:1 roofs and a 5-pixel wall. The honey follows the wordmark's cell: lit
 * from the upper left, like every pixel of the interface, the section title beside it included,
 * which drops its shadow down and to the right. A pollen glint a pixel off the upper-left wall, a
 * gold surface, honey below, marmalade along the right wall where the honey turns from the light,
 * and amber where it pools in the point.
 */
const COMB = {
  empty: `
    ....oo....
    ..oo..oo..
    oo......oo
    o........o
    o........o
    o........o
    o........o
    o........o
    oo......oo
    ..oo..oo..
    ....oo....
  `,
  half: `
    ....oo....
    ..oo..oo..
    oo......oo
    o........o
    o........o
    ogppgggggo
    ohhhhhhhho
    ohhhhhhhmo
    oohhhhhmoo
    ..oomaoo..
    ....oo....
  `,
  full: `
    ....oo....
    ..ooggoo..
    ooggggggoo
    ogppgggggo
    ogggggggho
    ogghhhhhho
    ohhhhhhhho
    ohhhhhhhmo
    oohhhhhmoo
    ..oomaoo..
    ....oo....
  `,
};

/**
 * A honeycomb cell, 10×11, the shape of the honeycomb motif: empty, half full of honey (games in
 * the works), or full.
 * @param {"empty" | "half" | "full"} fill
 * @param {{ drop?: boolean }} [options] drop: a 1-pixel burnt-comb drop down and to the right, the
 *   section title's own, which makes the cell 11×12. The whole hexagon casts it, so none shows
 *   inside the cell, which has a back wall.
 */
export function combCell(fill, { drop = false } = {}) {
  if (!Object.hasOwn(COMB, fill)) throw new Error(`combCell: unknown fill "${fill}"`);
  const cell = sprite(COMB[fill], { o: C.tawny, p: C.pollen, g: C.gold, h: C.honey, m: C.marmalade, a: C.amber });
  if (!drop) return cell;
  const hexagon = new Raster(cell.width, cell.height);
  for (let y = 0; y < cell.height; y++) {
    const xs = Array.from({ length: cell.width }, (_, x) => x).filter((x) => cell.get(x, y) !== null);
    hexagon.rect(xs[0], y, xs[xs.length - 1] - xs[0] + 1, 1, C["burnt-comb"]);
  }
  const out = new Raster(cell.width + 1, cell.height + 1).draw(hexagon, 1, 1);
  for (let i = 0; i < hexagon.pixels.length; i++) {
    if (hexagon.pixels[i] !== null) out.set(i % cell.width, Math.floor(i / cell.width), null);
  }
  return out.draw(cell, 0, 0);
}

/* ---------------------------------------------------------------------------------------------
 * Teaser tiles
 * ------------------------------------------------------------------------------------------- */

/**
 * Both tiles share one layout, side by side on the page: the program on the left (code, a gate),
 * its output on the right (the 8×8 grid, the truth table) in a grid of bark lines, a propolis band
 * on what runs now, and gold once, on the answer.
 */
const TILE = { width: 160, height: 84, right: 147, top: 9 };

/** A 3×5 font for the truth table. */
const TINY = bitmapFont({
  spacing: 1,
  glyphs: {
    0: "###|#.#|#.#|#.#|###",
    1: ".#.|##.|.#.|.#.|###",
    A: ".#.|#.#|###|#.#|#.#",
    B: "##.|#.#|##.|#.#|##.",
    Y: "#.#|#.#|.#.|.#.|.#.",
  },
});

/**
 * Lines of code as dashes, two pixels tall, one line every 8 rows, tokens 2 pixels apart, indents
 * of 8: [indent, [length, color name][]]. Keywords in peach, names in beeswax, the rest in wax, and
 * each paint call in the color it paints. The loop closes with an "end", a keyword.
 * @type {[number, [number, string][]][]}
 */
const KIDS_CODE = [
  [0, [[8, "peach"], [8, "beeswax"], [26, "wax"], [2, "wax"]]],
  [1, [[4, "peach"], [10, "beeswax"], [14, "wax"]]],
  [2, [[10, "beeswax"], [10, "coral"], [4, "wax"]]],
  [1, [[14, "peach"], [10, "wax"], [2, "mist"], [2, "wax"]]],
  [2, [[10, "beeswax"], [10, "sunlit-grass"], [4, "wax"]]],
  [1, [[8, "peach"]]],
  [2, [[10, "beeswax"], [6, "sky"], [4, "wax"]]],
  [0, [[6, "peach"]]],
];

/** The line that runs now: it paints the leaves, and a leaf is the next cell of the grid. */
const KIDS_NOW = 4;

/**
 * Where the code starts, and its line pitch and indent, in pixels: its first line starts 3 rows
 * under the top of the grid beside it, and its last ends 4 rows above the grid's bottom.
 */
const CODE = { x: 14, y: 12, pitch: 8, indent: 8 };

/** The kids' picture, cell by cell. */
const KIDS_PICTURE = `
  ssssssss
  ssqpqsss
  sspcpsss
  ssqpqsss
  ssstllss
  slltssss
  ssstssss
  gggggggg
`;

/** Cells painted so far, in reading order: the next one is the left leaf's, at (1, 5). */
const KIDS_PAINTED = 5 * 8 + 1;

/** Draw my code Kids: a few lines of code, and the 8×8 grid they paint, still being painted. */
export function nextKids() {
  const out = new Raster(TILE.width, TILE.height, C["comb-black"]);
  const widest = Math.max(...KIDS_CODE.map(([indent, tokens]) => indent * CODE.indent + tokens.reduce((w, [n]) => w + n + 2, -2)));
  out.rect(CODE.x - 2, CODE.y + KIDS_NOW * CODE.pitch - 2, widest + 4, 6, C.propolis);
  KIDS_CODE.forEach(([indent, tokens], line) => {
    let x = CODE.x + indent * CODE.indent;
    for (const [length, color] of tokens) {
      out.rect(x, CODE.y + line * CODE.pitch, length, 2, C[color]);
      x += length + 2;
    }
  });
  const picture = sprite(KIDS_PICTURE, {
    s: C.sky,
    p: C.coral,
    q: C.clover,
    c: C.gold,
    t: C.grass,
    l: C["sunlit-grass"],
    g: C.moss,
  });
  const cell = 7;
  const size = 8 * (cell + 1) + 1;
  const x0 = TILE.right - size + 1;
  out.rect(x0, TILE.top, size, size, C.bark);
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const color = j * 8 + i < KIDS_PAINTED ? picture.get(i, j) : C["comb-black"];
      out.rect(x0 + 1 + i * (cell + 1), TILE.top + 1 + j * (cell + 1), cell, cell, color);
    }
  }
  return out;
}

/**
 * The AND gate's outline: a flat back and a half circle drawn as a pixel artist would, its quarter
 * arcs in runs of 4, 3, 2, 1 pixels, then 1, 2, 3, 4 rows. 28×29, the body filled.
 */
function andGate() {
  const runs = [4, 3, 2, 1];
  const flat = 14;
  const half = runs.reduce((a, b) => a + b, 0) + runs.length;
  const height = 2 * half + 1;
  /** @type {number[]} right edge of the outline, row by row, for the top half */
  const right = [];
  let x = flat;
  runs.forEach((run) => {
    x += run;
    right.push(x - 1);
  });
  [...runs].reverse().forEach((run, i) => {
    for (let k = 0; k < run; k++) right.push(x + i);
  });
  const width = right[right.length - 1] + 1;
  const out = new Raster(width, height);
  for (let y = 0; y < height; y++) {
    const r = right[Math.min(y, height - 1 - y, half - 1)];
    out.rect(0, y, r + 1, 1, C.propolis);
  }
  // The outline: every body pixel with a side out of the body.
  const body = out.clone();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!body.get(x, y)) continue;
      const edge = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => !body.get(x + dx, y + dy));
      if (edge) out.set(x, y, C.wax);
    }
  }
  return out;
}

/** Columns between a wire's end and its label, the same for the inputs and the output. */
const LABEL_GAP = 3;

/** Truth Table Game: an AND gate, lit for the row where both inputs are 1, and its truth table. */
export function nextTruthTable() {
  const out = new Raster(TILE.width, TILE.height, C["comb-black"]);
  // The gate, its inputs both on, its output on.
  const gate = andGate();
  const gx = 34;
  const gy = TILE.top + 33 - Math.floor(gate.height / 2);
  const mid = gy + Math.floor(gate.height / 2);
  const wire = { in: 14, out: 12 };
  out.draw(gate, gx, gy);
  out.rect(gx - wire.in, mid - 7, wire.in, 1, C.mist);
  out.rect(gx - wire.in, mid + 7, wire.in, 1, C.mist);
  out.rect(gx + gate.width, mid, wire.out, 1, C.mist);
  const inLabel = gx - wire.in - LABEL_GAP - 3;
  drawText(out, TINY, "A", inLabel, mid - 9, C.wax);
  drawText(out, TINY, "B", inLabel, mid + 5, C.wax);
  drawText(out, TINY, "Y", gx + gate.width + wire.out + LABEL_GAP, mid - 2, C.wax);
  // The table, in the grid of the kids' tile: zeros faint, ones lit like the wires, and the one
  // true output in gold.
  const colW = 15;
  const rowH = 12;
  const width = 3 * (colW + 1) + 1;
  const tx = TILE.right - width + 1;
  const height = 11 + 4 * rowH + 6;
  out.rect(tx, TILE.top, width, height, C.bark);
  /** @param {number} r */
  const rowTop = (r) => (r === 0 ? TILE.top + 1 : TILE.top + 1 + 11 + 1 + (r - 1) * (rowH + 1));
  const rows = [
    [0, 0, 0],
    [0, 1, 0],
    [1, 0, 0],
    [1, 1, 1],
  ];
  for (let c = 0; c < 3; c++) {
    const x = tx + 1 + c * (colW + 1);
    out.rect(x, rowTop(0), colW, 11, C["comb-black"]);
    drawText(out, TINY, ["A", "B", "Y"][c], x + 6, rowTop(0) + 3, C.wax);
    rows.forEach((row, r) => {
      const v = row[c];
      const answer = c === 2 && v === 1;
      out.rect(x, rowTop(r + 1), colW, rowH, answer ? C.gold : v ? C.slate : C["comb-black"]);
      drawText(out, TINY, String(v), x + 6, rowTop(r + 1) + 4, answer ? C["comb-black"] : v ? C.glint : C["old-wax"]);
    });
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------
 * 404: a lone flower at dusk
 * ------------------------------------------------------------------------------------------- */

/**
 * The 404 art is a small framed window onto the meadow, on a transparent canvas: the bee's dotted
 * path starts at the flower inside and runs out through the frame, across the page.
 */
const LOST = {
  width: 120,
  height: 60,
  /** The frame line's outer box, in canvas pixels; the scene fills the box inside it. */
  frame: { x: 0, y: 7, width: 94, height: 51 },
  /** Scene column where the sun went down. */
  glow: 62,
  /** Scene column of the flower's stem. */
  flower: 25,
};

/** The sky's bands, top to bottom. */
const SKY_BANDS = ["night", "dusk", "slate", "deep-teal", "sky", "peach", "honey"];

/**
 * The edges between the sky's bands, top to bottom: [row far from the glow, rise toward the glow,
 * width of that rise], in scene rows. The warm bands only clear the hills near the glow.
 * @type {[number, number, number][]}
 */
const SKY_EDGES = [
  [8, 2, 40],
  [16, 4, 36],
  [24, 6, 32],
  [32, 7, 30],
  [42, 8, 26],
  [45, 9, 12],
];

/**
 * The row of the k-th band edge at scene column x.
 * @param {number} k
 * @param {number} x
 */
function skyEdge(k, x) {
  const [base, rise, width] = SKY_EDGES[k];
  return base - rise * Math.exp(-(((x - LOST.glow) / width) ** 2));
}

/**
 * A row of dashes: runs of `dash` pixels set, separated by runs of `gap` pixels unset.
 * @param {ReturnType<typeof rng>} random
 * @param {number} width
 * @param {[number, number]} dash
 * @param {[number, number]} gap
 */
function dashes(random, width, dash, gap) {
  /** @type {boolean[]} */
  const row = [];
  let on = random.chance(0.5);
  while (row.length < width) {
    const run = on ? random.int(...dash) : random.int(...gap);
    for (let i = 0; i < run; i++) row.push(on);
    on = !on;
  }
  return row.slice(0, width);
}

/**
 * Flat bands, then hatched strata at every band edge: the last row above an edge carries dashes
 * of the band below, the first row under it dashes of the band above, so the sky reads as layers
 * of air, not as a smooth gradient.
 * @param {Raster} out
 * @param {ReturnType<typeof rng>} random
 */
function paintSky(out, random) {
  const { width: W, height: H } = out;
  const edges = SKY_EDGES.map((_, k) => Array.from({ length: W }, (_, x) => Math.round(skyEdge(k, x))));
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const band = edges.filter((e) => y >= e[x]).length;
      out.set(x, y, C[SKY_BANDS[band]]);
    }
  }
  edges.forEach((edge, k) => {
    const down = dashes(random, W, [2, 4], [3, 7]);
    const up = dashes(random, W, [2, 3], [4, 9]);
    for (let x = 0; x < W; x++) {
      if (down[x]) out.set(x, edge[x] - 1, C[SKY_BANDS[k + 1]]);
      if (up[x]) out.set(x, edge[x], C[SKY_BANDS[k]]);
    }
  });
  // No dash shorter than two pixels: a lone pixel would read as a star.
  for (let y = 0; y < H; y++) {
    for (let x = 1; x < W - 1; x++) {
      const c = out.get(x, y);
      if (c !== out.get(x - 1, y) && c !== out.get(x + 1, y)) out.set(x, y, out.get(x - 1, y));
    }
  }
}

/**
 * The far ridge's top edge, in scene rows.
 * @param {number} x
 */
function ridgeTop(x) {
  return (
    35 +
    1.3 * Math.sin(x / 8 + 0.5) +
    0.6 * Math.sin(x / 3.7 + 1) -
    1.5 * Math.exp(-(((x - 76) / 8) ** 2)) +
    2.2 * Math.exp(-(((x - LOST.glow) / 7) ** 2))
  );
}

/**
 * The meadow's top edge, in scene rows, with a low rise where the flower stands.
 * @param {number} x
 */
function meadowTop(x) {
  return 42.2 + 1.2 * Math.sin(x / 13 + 2) - 3 * Math.exp(-(((x - LOST.flower) / 9) ** 2));
}

/** The flower's head, petals lit by the dusk sky, the rim by the afterglow. */
const FLOWER_HEAD = `
  .....11.....1R.....
  .....111...111.....
  ......111.111......
  2222...11.11...111R
  222222..1.1..1111RR
  ...22222ggY11111...
  .......ccggc.......
  ...33333rcc22222...
  333333..3t3..2222RR
  3333...33t33...222R
  ......333t333......
  .....333...333.....
  .....33.....33.....
`;

/**
 * The pixels of a one-pixel Bresenham line, from its first end to its second.
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 */
function stair(x0, y0, x1, y1) {
  /** @type {[number, number][]} */
  const out = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let x = x0, y = y0; ; ) {
    out.push([x, y]);
    if (x === x1 && y === y1) return out;
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
}

/**
 * Grass tufts, the hero's way: one-pixel blades fanning out of the ground, each a clean stair. A
 * blade is [root column, lean, height]: it rises from the row above the meadow's edge, its tip
 * stands `lean` columns aside, and its height is a multiple of |lean| + 1, so all the steps of its
 * stair are the same length. Blades meet only in their root row: the side blades leave the root at
 * 45 degrees, or rise two columns out. The tufts gather in four clumps with bare ground between:
 * in the shade at the left, at the flower's foot, and on each side of the glow, where they stay
 * low enough that every tip stands against the ridge: [column, blades].
 * @type {[number, [number, number, number][]][]}
 */
const TUFTS = [
  [4, [[-1, -2, 3], [0, 0, 4], [2, 1, 6]]],
  [10, [[-1, -1, 2], [0, 0, 4], [1, 1, 2]]],
  [20, [[-2, -1, 6], [0, 1, 4]]],
  [30, [[-1, -1, 2], [0, 0, 4], [1, 1, 2]]],
  [47, [[-1, -2, 3], [0, 0, 4], [1, 2, 3]]],
  [54, [[-1, -1, 2], [0, 0, 4], [1, 1, 2]]],
  [73, [[-2, -1, 6], [0, 0, 4], [1, 2, 3]]],
  [81, [[-1, -2, 3], [0, 0, 5], [1, 2, 3]]],
];

/** Columns of the afterglow's reach: tufts this close to it carry lit tips on its side. */
const GLOW_REACH = 24;

/**
 * Draws the tufts in grass, which stands out from the dark ridge where moss would sink into it; on
 * blades that lean into the glow, where it reaches, the top two pixels are sunlit.
 * @param {Raster} scene
 * @param {number[]} meadow the meadow's top row, by column
 */
function paintTufts(scene, meadow) {
  for (const [x, blades] of TUFTS) {
    const toward = Math.abs(x - LOST.glow) <= GLOW_REACH ? Math.sign(LOST.glow - x) : 0;
    for (const [root, lean, height] of blades) {
      const y = meadow[x + root] - 1;
      const points = stair(x + root, y, x + root + lean, y - height + 1);
      const lit = toward !== 0 && Math.sign(lean) === toward;
      points.forEach(([px, py], k) => scene.set(px, py, C[lit && k >= points.length - 2 ? "sunlit-grass" : "grass"]));
    }
  }
}

/**
 * Points along a Catmull-Rom spline through the given points, closely spaced.
 * @param {[number, number][]} points
 */
function spline(points) {
  /** @type {[number, number][]} */
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const [p1, p2] = [points[i], points[i + 1]];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < 40; s++) {
      const t = s / 40;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ c, /** @type {number} */ d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Dots every `gap` pixels along a path.
 * @param {[number, number][]} path
 * @param {number} gap
 */
function dotsAlong(path, gap) {
  /** @type {[number, number][]} */
  const dots = [[Math.round(path[0][0]), Math.round(path[0][1])]];
  let run = 0;
  for (let i = 1; i < path.length; i++) {
    run += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (run >= gap) {
      dots.push([Math.round(path[i][0]), Math.round(path[i][1])]);
      run = 0;
    }
  }
  return dots;
}

/**
 * The bee's dotted path, the brand's one ramp for it, as in the hero: from the oldest dot to the
 * newest, amber, marmalade, honey, gold. A dot keeps at least `contrast` against what lies under
 * it, or takes the next color of the ramp.
 */
const TRAIL = { colors: ["amber", "marmalade", "honey", "gold"], gap: 3.4, contrast: 1.8 };

/**
 * Stars over the dark half of the sky, away from the bee's path, in scene pixels; the evening star
 * is the twinkle.
 * @type {[number, number, string][]}
 */
const STARS = [
  [5, 3, "mist"],
  [13, 11, "wax"],
  [3, 19, "mist"],
  [42, 13, "mist"],
  [68, 3, "glint"],
  [84, 14, "mist"],
  [80, 1, "beeswax"],
];

/**
 * Where the evening star stands, in scene pixels: its arms on slate and dusk, and no tip touching
 * a dash of deep teal, which would draw it out into a ledge.
 * @type {[number, number]}
 */
const EVENING_STAR = [54, 11];

/**
 * Grounds dark enough for the flower's stem to show in grass, lighter than them: the upper sky and
 * the ridge. Against brighter ones, it shows in moss, darker than them.
 */
const DARK_GROUNDS = new Set(["night", "dusk", "slate", "wine"].map((name) => C[name]));

/**
 * A filled rectangle without its four corner pixels: the brand's notched corner.
 * @param {Raster} out
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} color
 */
function notched(out, x, y, w, h, color) {
  out.rect(x + 1, y, w - 2, h, color);
  out.rect(x, y + 1, w, h - 2, color);
}

/** The 404 art: a lone flower at dusk; the bee has left it, and its dotted path leaves the frame. */
export function lost() {
  const { frame } = LOST;
  const scene = new Raster(frame.width - 2, frame.height - 2, C.hive);
  const random = rng(404);
  paintSky(scene, random);

  for (const [x, y, color] of STARS) scene.set(x, y, C[color]);
  scene.draw(twinkle(), ...EVENING_STAR);

  // The far ridge, backlit, with a saddle where the sun went down: its crest catches the
  // afterglow, and the last light lies along the saddle.
  const ridge = Array.from({ length: scene.width }, (_, x) => Math.round(ridgeTop(x)));
  const crest = ridge.map((_, x) => {
    const lit = Math.exp(-(((x - LOST.glow) / 20) ** 2));
    return lit > 0.5 ? "clover" : lit > 0.15 ? "heather" : "wine";
  });
  for (let x = 0; x < scene.width; x++) {
    for (let y = ridge[x]; y < scene.height; y++) scene.set(x, y, C.wine);
    scene.set(x, ridge[x], C[crest[x]]);
    const d = Math.abs(x - LOST.glow);
    if (d <= 3) scene.set(x, ridge[x] - 1, d <= 1 ? C.pollen : C.gold);
  }

  // The meadow, in the dark: its edge, and clumps of tufts whose tips catch the afterglow on its
  // side.
  const meadow = Array.from({ length: scene.width }, (_, x) => Math.round(meadowTop(x)));
  for (let x = 0; x < scene.width; x++) {
    for (let y = meadow[x]; y < scene.height; y++) scene.set(x, y, y === meadow[x] ? C.moss : C.hive);
  }
  paintTufts(scene, meadow);

  // The flower: a stem that bows a little, two thread leaves, the open head. Backlit, they are
  // a silhouette, drawn in whichever green stands out from what lies behind: grass against the
  // dark of the upper sky and of the ridge, moss against the bright sky low down. One sunlit
  // pixel tips the leaf that reaches toward the glow.
  const fx = LOST.flower;
  /** @type {[number, number][]} */
  const plant = [];
  for (const [x, y0, y1] of [
    [fx, 15, 23],
    [fx + 1, 24, 32],
    [fx, 33, meadow[fx] - 1],
  ]) {
    for (let y = y0; y <= y1; y++) plant.push([x, y]);
  }
  plant.push(...stair(fx + 2, 29, fx + 5, 26), ...stair(fx - 1, 35, fx - 4, 32));
  for (const [x, y] of plant) scene.set(x, y, DARK_GROUNDS.has(/** @type {string} */ (scene.get(x, y))) ? C.grass : C.moss);
  scene.set(fx + 6, 25, C["sunlit-grass"]);
  const head = sprite(FLOWER_HEAD, {
    1: C.glint,
    2: C.mist,
    3: C.sky,
    R: C.peach,
    Y: C.pollen,
    g: C.gold,
    c: C.honey,
    r: C.marmalade,
    t: C.moss,
  });
  scene.draw(head, fx - 9, 4);

  // The frame: an umber line with notched corners over a hard comb-black shadow, like the
  // site's panels.
  const out = new Raster(LOST.width, LOST.height);
  notched(out, frame.x + 2, frame.y + 2, frame.width, frame.height, C["comb-black"]);
  notched(out, frame.x, frame.y, frame.width, frame.height, C.umber);
  out.draw(scene, frame.x + 1, frame.y + 1);

  // The bee's path, in canvas pixels, from the flower out through the frame and across the page,
  // whose hive shows through the transparent canvas. The frame line stands in for the dot that
  // falls on it.
  const path = spline([
    [39, 13],
    [45, 10],
    [53, 10],
    [62, 14],
    [73, 17],
    [84, 15],
    [94, 11],
    [106, 7],
    [121, 3],
  ]);
  const dots = dotsAlong(path, TRAIL.gap).filter(([x, y]) => out.inside(x, y) && x !== frame.x + frame.width - 1);
  dots.forEach(([x, y], i) => {
    const under = out.get(x, y) ?? C.hive;
    let k = Math.floor((i * TRAIL.colors.length) / dots.length);
    while (k < TRAIL.colors.length - 1 && contrast(C[TRAIL.colors[k]], under) < TRAIL.contrast) k++;
    out.set(x, y, C[TRAIL.colors[k]]);
  });
  return out;
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
