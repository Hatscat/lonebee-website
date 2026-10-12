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
const JUNIOR_CODE = [
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
const JUNIOR_NOW = 4;

/**
 * Where the code starts, and its line pitch and indent, in pixels: its first line starts 3 rows
 * under the top of the grid beside it, and its last ends 4 rows above the grid's bottom.
 */
const CODE = { x: 14, y: 12, pitch: 8, indent: 8 };

/** The young coder's picture, cell by cell. */
const JUNIOR_PICTURE = `
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
const JUNIOR_PAINTED = 5 * 8 + 1;

/** Draw my code Junior: a few lines of code, and the 8×8 grid they paint, still being painted. */
export function nextJunior() {
  const out = new Raster(TILE.width, TILE.height, C["comb-black"]);
  const widest = Math.max(...JUNIOR_CODE.map(([indent, tokens]) => indent * CODE.indent + tokens.reduce((w, [n]) => w + n + 2, -2)));
  out.rect(CODE.x - 2, CODE.y + JUNIOR_NOW * CODE.pitch - 2, widest + 4, 6, C.propolis);
  JUNIOR_CODE.forEach(([indent, tokens], line) => {
    let x = CODE.x + indent * CODE.indent;
    for (const [length, color] of tokens) {
      out.rect(x, CODE.y + line * CODE.pitch, length, 2, C[color]);
      x += length + 2;
    }
  });
  const picture = sprite(JUNIOR_PICTURE, {
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
      const color = j * 8 + i < JUNIOR_PAINTED ? picture.get(i, j) : C["comb-black"];
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
  // The table, in the grid of the Junior tile: zeros faint, ones lit like the wires, and the one
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
 * 404: a lone flower at dusk, in the mountains
 * ------------------------------------------------------------------------------------------- */

/**
 * The 404 art is a small framed window onto a summer pasture of the Ariège Pyrenees at dusk, on a
 * transparent canvas: a carline thistle stands alone, its bee flown away, and the bee's dotted
 * path starts at the flower and runs out through the frame, across the page. Behind it the
 * valley's slopes close in from both sides, and at their head rises the twin massif of the
 * Montcalm and the Pic d'Estats.
 *
 * It is the hero's valley later the same evening. The home page shows the golden hour, the sun
 * half set in the col; here it has gone down behind the frontier ridge on the right, and the
 * blue hour has come. The light keeps the hero's rules an hour on: one light, low on the right,
 * now the afterglow; the faces in view are in shade; every edge that faces the light, near it,
 * takes a continuous one-pixel rim. Only the colors have moved down their ramps: where the
 * hero's crests burn amber, these take heather and clover, and the snow, pollen and peach in the
 * hero, lies in the blue of the hour, but on the high summit's crest, where the last light lingers.
 *
 * One difference is deliberate, so keep it: the 404 shades its whole massif as the sky behind it
 * one step darker, where the hero does so only near the sun and paints its low left ridge flat
 * night. The hero's copy needs that ridge dark, and shaded from the sky it dissolves into the
 * slate strata there; this window has no copy over it, and its massif is its subject.
 */
const LOST = {
  width: 120,
  height: 60,
  /** The frame line's outer box, in canvas pixels; the scene fills the box inside it. */
  frame: { x: 0, y: 7, width: 94, height: 51 },
  /** Scene column where the sun went down. */
  glow: 72,
  /** Scene column of the flower's stem. */
  flower: 25,
};

/** The sky's bands, top to bottom. */
const SKY_BANDS = ["night", "dusk", "slate", "deep-teal", "sky", "peach", "honey"];

/**
 * The edges between the sky's bands, top to bottom: [row far from the glow, rise toward the glow,
 * width of that rise, sharpness], in scene rows. The cool bands bow up gently over the glow; the
 * warm ones are flat lenses that clear the far ridge only near it, so the afterglow lies level
 * along the horizon.
 * @type {[number, number, number, number][]}
 */
const SKY_EDGES = [
  [7, 3, 40, 2],
  [14, 5, 36, 2],
  [20, 9, 34, 2],
  [27, 10, 30, 2],
  [36, 12, 17, 4],
  [34, 8, 9, 4],
];

/**
 * The far horizon under the glow, in scene rows: the warm bands lie above it, and the air under
 * it, which only shows through the massif, is the evening's teal.
 */
const HORIZON = 28;

/**
 * The row of the k-th band edge at scene column x.
 * @param {number} k
 * @param {number} x
 */
function skyEdge(k, x) {
  const [base, rise, width, sharpness] = SKY_EDGES[k];
  return base - rise * Math.exp(-((Math.abs(x - LOST.glow) / width) ** sharpness));
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
 * Hatched strata for shading, as in the hero: every row cut into dashes of 2 to 6 pixels, each
 * with its own threshold, so a shade grows in rows of dashes, never in a checkerboard.
 * @param {number} seed
 * @param {number} width
 * @param {number} height
 */
function strata(seed, width, height) {
  const random = rng(seed);
  const field = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    let x = -random.int(0, 4);
    while (x < width) {
      const run = random.int(2, 6);
      const threshold = random.next();
      for (let i = x; i < x + run; i++) if (i >= 0 && i < width) field[y * width + i] = threshold;
      x += run;
    }
  }
  return field;
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
      out.set(x, y, C[SKY_BANDS[y >= HORIZON ? Math.min(band, 4) : band]]);
    }
  }
  edges.forEach((edge, k) => {
    const down = dashes(random, W, [2, 4], [3, 7]);
    const up = dashes(random, W, [2, 3], [4, 9]);
    for (let x = 0; x < W; x++) {
      if (k >= 4 && edge[x] > HORIZON) continue;
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
 * The twin massif at the head of the valley, drawn by hand as the stair runs of its crest from
 * column 18: [row, columns]. A long shoulder with a ledge; the broad dome of the Montcalm, in runs
 * of 1, 1, 2, 2, 3, 2, 2; a col; the sharp pyramid of the Pic d'Estats, two rows higher, in even
 * 1:1 stairs; then the frontier ridge, long and low, and the saddle where the sun went down. The
 * hero draws the same skyline: the broad dome on the left, the higher pyramid on its right, the
 * light just beyond.
 */
const MASSIF = {
  x: 18,
  runs: [
    [31, 1], [30, 2], [29, 2], [28, 1], [27, 2], [26, 1], [25, 3], [24, 1], [23, 1], [22, 1], [21, 1],
    [20, 1], [19, 1], [18, 2], [17, 2], [16, 3], [17, 2], [18, 1], [19, 1], [20, 2], [19, 1], [18, 1],
    [17, 1], [16, 1], [15, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 2], [20, 1], [21, 1],
    [22, 1], [23, 1], [24, 1], [25, 1], [26, 2], [27, 2], [28, 4], [27, 3], [28, 3], [27, 3], [28, 20],
  ],
};

/**
 * The massif is far, so it is seen through the evening air: each pixel takes the color of the sky
 * behind it one step into shadow, with the sky's own strata, cool and dark away from the glow. It
 * is later than the hero's golden hour, so the glow's colors fall to heather, not amber.
 */
const SHADOW = /** @type {Record<string, string>} */ ({
  night: "night", dusk: "night", slate: "dusk", "deep-teal": "dusk", sky: "slate",
  peach: "heather", honey: "heather",
});

/** The glow's colors: backlit, the massif keeps them on its crest only, and its body stays cool. */
const WARM = new Set(["peach", "honey"]);

/** Names of the colors the massif reads, by value. */
const NAME_OF = new Map([...SKY_BANDS, ...Object.values(SHADOW)].map((name) => [C[name], name]));

/**
 * The faces in the hero's language: light couloirs high on the summits, arêtes lower down. Each
 * line falls in an even stair of three rows a column, as steep as the hero's: [column, row, -1 to
 * the west or 1 to the east, snow pixels, length]. Its first pixels are snow, in shade, the blue
 * of the hour, two steps lighter than the rock, as the hero's shaded snow is the hue of its rock,
 * lighter; one snowy couloir a summit, on its shaded side. Then the line is an arête: a rib a step
 * darker than the rock, all but lost high up, where the rock is dark, so the arêtes seem to come
 * out of the summits' shade; lower down, where the rock is lighter, its side toward the glow
 * catches the sky's light, a step lighter, but for its foot, which fades into the rock.
 * @type {[number, number, number, number, number][]}
 */
const COULOIRS = [
  [40, 18, -1, 2, 11],
  [44, 20, 1, 0, 6],
  [53, 17, -1, 2, 10],
  [56, 19, 1, 0, 7],
];
const SNOW = /** @type {Record<string, string>} */ ({ night: "slate", dusk: "deep-teal", slate: "deep-teal" });
const RIB = /** @type {Record<string, string>} */ ({ dusk: "night", slate: "dusk", "deep-teal": "slate" });
const LIT_SIDE = /** @type {Record<string, string>} */ ({ slate: "deep-teal" });

/**
 * The last light, on the high summit only, a rim as in the hero: down the sunward crest from
 * under the tip, which stays in the crest's shade, fading as it falls away from the light:
 * [column, color]. The dome, lower and in the summit's shadow, has none.
 * @type {[number, string][]}
 */
const ALPENGLOW = [
  [55, "peach"],
  [56, "peach"],
  [57, "coral"],
  [58, "clover"],
  [59, "heather"],
];

/**
 * The haze in the valley, as in the hero: in the rows over the slopes' crest, a growing share of
 * the massif's dashes lifts a step, so its foot sinks into the evening air. The air right around
 * the flower's stem stays clear, or the stem would sink into the haze: [rows, lift, stem column].
 */
const HAZE = {
  rows: 3,
  lift: /** @type {Record<string, string>} */ ({ dusk: "slate", slate: "deep-teal" }),
  stem: LOST.flower + 1,
};

/**
 * Paints the massif over the sky and returns its crest row by column (Infinity where it is not).
 * A crest pixel that would match the sky above it goes a step deeper, so the ridgeline stays
 * whole. Then the haze at its foot, the couloirs and ribs on its faces, the glow's rim on the
 * frontier ridge near it, with a sliver of gold in the saddle, and the last light on the summit.
 * @param {Raster} scene
 * @param {number[]} hills the slopes' crest, by column, which the haze lies over
 */
function paintMassif(scene, hills) {
  const W = scene.width;
  /** @type {number[]} */
  const top = new Array(W).fill(Infinity);
  let x0 = MASSIF.x;
  for (const [row, columns] of MASSIF.runs) for (let i = 0; i < columns && x0 < W; i++) top[x0++] = row;
  const name = (/** @type {number} */ x, /** @type {number} */ y) => NAME_OF.get(/** @type {string} */ (scene.get(x, y))) ?? "dusk";
  for (let x = 0; x < W; x++) {
    if (!isFinite(top[x])) continue;
    const above = name(x, top[x] - 1);
    for (let y = top[x]; y < scene.height; y++) {
      const air = WARM.has(name(x, y)) ? "sky" : name(x, y);
      scene.set(x, y, C[SHADOW[air] ?? air]);
    }
    if (WARM.has(above)) scene.set(x, top[x], C[SHADOW[above]]);
    else if (scene.get(x, top[x]) === scene.get(x, top[x] - 1)) scene.set(x, top[x], C[SHADOW[name(x, top[x])] ?? name(x, top[x])]);
  }
  // The crest cuts the sky's dashes: one cut down to a pixel would read as a star, so it takes
  // the sky beside it.
  for (let x = 1; x < W - 1; x++) {
    for (let y = 0; y < Math.min(top[x], scene.height); y++) {
      const c = scene.get(x, y);
      if (c === scene.get(x - 1, y) || c === scene.get(x + 1, y)) continue;
      scene.set(x, y, y < top[x - 1] ? scene.get(x - 1, y) : scene.get(x + 1, y));
    }
  }
  const grain = strata(47, W, scene.height);
  for (let x = 0; x < W; x++) {
    if (Math.abs(x - HAZE.stem) <= 1) continue;
    for (let y = Math.max(top[x] + 1, hills[x] - HAZE.rows); y < hills[x]; y++) {
      const lifted = HAZE.lift[name(x, y)];
      if (lifted && grain[y * W + x] < (y - hills[x] + HAZE.rows + 1) / (HAZE.rows + 1)) scene.set(x, y, C[lifted]);
    }
  }
  // A dash that the haze's reach cuts down to a pixel takes the color of the one beside it.
  for (let x = 1; x < W - 1; x++) {
    for (let y = Math.max(top[x - 1], top[x], top[x + 1]) + 1; y < hills[x]; y++) {
      const left = scene.get(x - 1, y);
      if (left === scene.get(x + 1, y) && left !== scene.get(x, y)) scene.set(x, y, left);
    }
  }
  for (const [cx, cy, dir, snow, length] of COULOIRS) {
    for (let k = 0; k < length; k++) {
      const [x, y] = [cx + dir * Math.floor(k / 3), cy + k];
      const color = (k < snow ? SNOW : RIB)[name(x, y)];
      const lit = LIT_SIDE[name(x + 1, y)];
      if (y > top[x] && color) scene.set(x, y, C[color]);
      if (k > snow && k < length - 2 && lit) scene.set(x + 1, y, C[lit]);
    }
  }
  for (let x = 0; x < W; x++) {
    const d = Math.abs(x - LOST.glow);
    if (!isFinite(top[x]) || d > 8 || top[x] < 25) continue;
    scene.set(x, top[x], C[d <= 4 ? "honey" : "amber"]);
    if (d <= 3) scene.set(x, top[x] - 1, d <= 1 ? C.pollen : C.gold);
  }
  for (const [x, color] of ALPENGLOW) scene.set(x, top[x], C[color]);
  return top;
}

/**
 * The valley's slopes, heather moors under forest closing in from both sides, as points of their
 * crest [column, row], eased between: the valley opens in a V under the massif.
 * @type {[number, number][]}
 */
const SLOPES = [
  [0, 29], [10, 30], [22, 32], [32, 34], [40, 36], [46, 38], [51, 38], [57, 36], [62, 34], [66, 33],
  [70, 33], [76, 31], [84, 28], [91, 27],
];

/**
 * The slopes' crest row by column, bare of trees.
 * @param {number} width
 */
function slopesCrest(width) {
  return Array.from({ length: width }, (_, x) => {
    const k = SLOPES.findIndex(([x1]) => x1 >= x);
    if (k <= 0) return SLOPES[0][1];
    const [[xa, ya], [xb, yb]] = [SLOPES[k - 1], SLOPES[k]];
    return Math.round(ya + ((yb - ya) * (1 - Math.cos((Math.PI * (x - xa)) / (xb - xa)))) / 2);
  });
}

/**
 * Raises a forest on a crest, seen from afar, as in the hero: fir spires, a one-pixel tip, then
 * three, then five, among the rounder crowns of beeches, at random but even spacing.
 * @param {number[]} top
 * @param {number} seed
 * @param {{ tall: [number, number], gap: [number, number], beech: number, clearings?: [number, number][] }} look
 *   tall: fir heights; gap: columns between trees; beech: the share of round crowns; clearings:
 *   [from, to] columns left bare, where the trees would have stood
 */
function forest(top, seed, { tall, gap, beech, clearings = [] }) {
  const random = rng(seed);
  for (let x = random.int(0, gap[1]); x < top.length; x += random.int(...gap)) {
    const ground = top[x];
    const fir = !random.chance(beech);
    const h = fir ? random.int(...tall) : 0;
    if (clearings.some(([a, b]) => x >= a && x <= b)) continue;
    for (let i = -2; i <= 2; i++) {
      if (x + i < 0 || x + i >= top.length) continue;
      top[x + i] = Math.min(top[x + i], fir ? ground - h + 2 * Math.abs(i) : ground - (Math.abs(i) < 2 ? 1 : 0));
    }
  }
  return top;
}

/**
 * A mountain pine on a knoll at the glow's edge, as in the hero: a straight trunk, a ragged crown
 * of tufts in two tiers, longer on the side the wind blows to; the glow catches the tufts that face
 * it. Eight rows against fir spires of two or three, as the hero's nine against the same forest: a
 * mountain pine is a small tree, outgrown by the firs, so it stands alone, in a clearing, where no
 * fir beside it can show it up as a giant.
 */
const PINE = `
  ...aa....
  ..baaa...
  ...aaaa..
  .baaaaaa.
  ....a....
  .baaaaaaa
  ....a....
  ....a....
`;

/**
 * The pine's knoll on the slopes' crest: [column of the trunk, half-width, rows]; and the columns
 * of the forest left bare around it, out to the frame.
 */
const KNOLL = /** @type {[number, number, number]} */ ([83, 2, 1]);
const CLEARING = /** @type {[number, number]} */ ([76, 94]);

/**
 * The slopes: wine, their forest a silhouette, the moor under it grazed by the glow in heather
 * strata that fade with depth and distance from it. Near the glow, their crest and the steps of
 * it that fall toward the glow take a clover rim, the hero's rule.
 * @param {Raster} scene
 * @param {number[]} hills the slopes' crest, by column
 */
function paintSlopes(scene, hills) {
  const W = scene.width;
  const ground = [...hills];
  const [kx, half, rise] = KNOLL;
  for (let i = -half; i <= half; i++) ground[kx + i] -= rise;
  const top = forest(ground, 5, { tall: [2, 3], gap: [4, 8], beech: 0.4, clearings: [CLEARING] });
  const grain = strata(31, W, scene.height);
  for (let x = 0; x < W; x++) {
    const reach = Math.exp(-((Math.abs(x - LOST.glow) / 14) ** 2));
    for (let y = top[x]; y < scene.height; y++) {
      const light = y < hills[x] ? 0 : reach * Math.max(0, 1 - (y - hills[x]) / 3);
      scene.set(x, y, C[light > grain[y * W + x] ? "heather" : "wine"]);
    }
  }
  for (let x = LOST.glow - 5; x <= LOST.glow + 5; x++) {
    const next = top[x + (x < LOST.glow ? 1 : -1)];
    for (let y = top[x]; y === top[x] || y < next; y++) scene.set(x, y, C.clover);
  }
  // A dash cut short by the light's reach leaves a lone pixel: give it to its neighbors; a speck
  // unlike all eight of its neighbors takes the color most of them have.
  for (let x = 1; x < W - 1; x++) {
    for (let y = Math.max(top[x - 1], top[x], top[x + 1]); y < scene.height; y++) {
      const left = scene.get(x - 1, y);
      if (left === scene.get(x + 1, y) && left !== scene.get(x, y)) scene.set(x, y, left);
    }
  }
  for (let x = 1; x < W - 1; x++) {
    for (let y = Math.max(top[x - 1], top[x], top[x + 1]) + 1; y < scene.height - 1; y++) {
      /** @type {Map<string | null, number>} */
      const count = new Map();
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
        const c = scene.get(x + dx, y + dy);
        count.set(c, (count.get(c) ?? 0) + 1);
      }
      if (!count.has(scene.get(x, y))) scene.set(x, y, [...count].sort((a, b) => b[1] - a[1])[0][0]);
    }
  }
  // A dash of the haze that a tree cuts down to a pixel takes the color of the air beside it, or
  // in a notch between two trees, of the air above it.
  for (let x = 1; x < W - 1; x++) {
    for (let y = hills[x] - HAZE.rows; y < top[x]; y++) {
      const c = scene.get(x, y);
      if (c === scene.get(x - 1, y) || c === scene.get(x + 1, y)) continue;
      const [left, right] = [y >= top[x - 1], y >= top[x + 1]];
      if (left && right) scene.set(x, y, scene.get(x, y - 1));
      else if (left) scene.set(x, y, scene.get(x + 1, y));
      else if (right) scene.set(x, y, scene.get(x - 1, y));
    }
  }
  // The pine, after the cleanups, which would take its one-pixel trunk for a speck.
  const pine = sprite(PINE, { a: C.wine, b: C.heather });
  const trunk = /** @type {string} */ (PINE.trim().split("\n").pop()).trim().indexOf("a");
  scene.draw(pine, kx - trunk, top[kx] - pine.height + 1);
}

/**
 * The meadow's top edge, in scene rows, with a low rise where the flower stands.
 * @param {number} x
 */
function meadowTop(x) {
  return 42.2 + 1.2 * Math.sin(x / 13 + 2) - 3 * Math.exp(-(((x - LOST.flower) / 9) ** 2));
}

/**
 * Grass tufts, the hero's way: one-pixel blades fanning out of the ground, each a clean stair. A
 * blade is [root column, lean, height]: it rises from the row above the meadow's edge, its tip
 * stands `lean` columns aside, and its height is a multiple of |lean| + 1, so all the steps of its
 * stair are the same length. Blades meet only in their root row: the side blades leave the root at
 * 45 degrees, or rise two columns out. The tufts gather in four clumps with bare ground between:
 * in the shade at the left, at the flower's foot, and on each side of the glow, where they stay
 * low enough that every tip stands against the moor: [column, blades].
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
 * Draws the tufts in grass, which stands out from the dark moor where moss would sink into it; on
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
 * The carline thistle's head, face on, as the Pyrenees know it, a sun nailed on the door: eighteen
 * glossy silver bracts that hold the light, glint where the sky lights them, mist at the sides,
 * sky in shade below, their seams a step darker and their tips toward the glow peach; the disc of
 * florets a low dome, wax where the sky lights its top, then old wax, then tawny, umber under its
 * rim, a few florets standing out, and a gold crescent on the glow side. The hero's carlines are
 * the same plant at the golden hour, their silver warm.
 */
const CARLINE = `
  ........1...1........
  .....1..11.11..1.....
  .....11111211111.....
  ...11211212121121R...
  ....1111oxxxo1111....
  .22223oxxxxooog322RR.
  ...322ooooowoog223...
  22222wwooooooogg222RR
  ...322uwwwowwwg223...
  .22223uuuwwwwuu322RR.
  ....3333uuuuu3333....
  ...33433434343343R...
  .....33333433333.....
  .....3..33.33..3.....
  ........3...3........
`;

/**
 * A spiny leaf of the carline, growing up and to the right of the stem: a lance of grass with
 * spines up and down. On the leaf that reaches toward the glow, the tip ("l") catches it.
 */
const LEAF = `
  ....n..
  ..n.n.l
  .nnnnn.
  nn.n...
`;

/**
 * Grounds dark enough for the flower's stem to show in grass, lighter than them: the upper sky,
 * the massif and the moor. Against brighter ones, it shows in moss, darker than them.
 */
const DARK_GROUNDS = new Set(["night", "dusk", "slate", "wine"].map((name) => C[name]));

/**
 * The carline: a stem that bows a little, two spiny leaves, the open head. Backlit, the stem and
 * leaves are a silhouette, each length of the stem in whichever green stands out from most of
 * what lies behind it, so it never flickers along the dashes of the air.
 * @param {Raster} scene
 * @param {number[]} meadow the meadow's top row, by column
 */
function paintCarline(scene, meadow) {
  const fx = LOST.flower;
  for (const [x, y0, y1] of [
    [fx, 18, 24],
    [fx + 1, 25, 32],
    [fx, 33, meadow[fx] - 1],
  ]) {
    let dark = 0;
    for (let y = y0; y <= y1; y++) if (DARK_GROUNDS.has(/** @type {string} */ (scene.get(x, y)))) dark++;
    for (let y = y0; y <= y1; y++) scene.set(x, y, 2 * dark >= y1 - y0 + 1 ? C.grass : C.moss);
  }
  scene.draw(sprite(LEAF, { n: C.grass, l: C["sunlit-grass"] }), fx + 2, 24);
  scene.draw(sprite(LEAF, { n: C.grass, l: C.grass }), fx - 7, 30, { flipX: true });
  const head = sprite(CARLINE, {
    1: C.glint,
    2: C.mist,
    3: C.sky,
    4: C["deep-teal"],
    R: C.peach,
    x: C.wax,
    o: C["old-wax"],
    w: C.tawny,
    u: C.umber,
    g: C.gold,
  });
  scene.draw(head, fx - 10, 3);
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
 * Stars over the dark half of the sky, away from the bee's path, in scene pixels; the massif hides
 * any that would fall behind it.
 * @type {[number, number, string][]}
 */
const STARS = [
  [5, 3, "mist"],
  [10, 9, "wax"],
  [3, 19, "mist"],
  [68, 3, "glint"],
  [84, 14, "mist"],
  [80, 1, "beeswax"],
];

/**
 * Where the evening star stands, in scene pixels: over the col between the twin tops, its arms on
 * slate and dusk, and no tip touching a dash of deep teal, which would draw it out into a ledge.
 * @type {[number, number]}
 */
const EVENING_STAR = [46, 8];

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
  const hills = slopesCrest(scene.width);
  paintSky(scene, rng(404));
  const massif = paintMassif(scene, hills);
  for (const [x, y, color] of STARS) if (y < massif[x]) scene.set(x, y, C[color]);
  scene.draw(twinkle(), ...EVENING_STAR);
  paintSlopes(scene, hills);

  // The meadow, in the dark: its edge, and clumps of tufts whose tips catch the afterglow on its
  // side; the carline on its rise.
  const meadow = Array.from({ length: scene.width }, (_, x) => Math.round(meadowTop(x)));
  for (let x = 0; x < scene.width; x++) {
    for (let y = meadow[x]; y < scene.height; y++) scene.set(x, y, y === meadow[x] ? C.moss : C.hive);
  }
  paintTufts(scene, meadow);
  paintCarline(scene, meadow);

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
