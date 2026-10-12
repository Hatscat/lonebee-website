// @ts-check
/**
 * Draws every generated image of the site and of the brand kit from the pieces in art/pieces/,
 * then writes them, or with --check writes nothing and fails when a file on disk differs.
 *
 * Every image is checked to use palette colors only before it is written, and is enlarged by whole
 * numbers only. Sizes follow the platforms' published specs (see design/README.md, "Platforms").
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isFresh } from "../scripts/tokens.js";
import { beeAt, trailAt } from "../site/js/flight.js";
import { encodeICO } from "./lib/ico.js";
import { Raster } from "./lib/raster.js";
import { svgOf } from "./lib/svg.js";
import { C, PALETTE } from "./palette.js";
import { combCell, lost, nextJunior, nextTruthTable, twinkle } from "./pieces/bits.js";
import { flagFrance, heart, mountain } from "./pieces/glyphs.js";
import { BEE, MOTION, SCENE, background, beeFrames } from "./pieces/hero.js";
import { mark, markSmall } from "./pieces/mark.js";
import { caption, wordmark } from "./pieces/wordmark.js";

/** Art pixels between the mark and the wordmark in a lockup. */
const LOCKUP_GAP = 6;

/**
 * @param {Raster} raster
 * @param {number} width
 * @param {number} height
 * @param {string | null} fill
 * @returns {Raster} the raster centered on a canvas of the given size
 */
function centered(raster, width, height, fill) {
  return new Raster(width, height, fill).draw(raster, Math.floor((width - raster.width) / 2), Math.floor((height - raster.height) / 2));
}

/**
 * The mark beside the wordmark, at the same pixel size, the bee facing the word.
 * @param {{ plainO?: boolean, ink?: string, shade?: string | null }} [options]
 */
export function lockup(options = {}) {
  const bee = mark();
  const word = wordmark(options);
  const out = new Raster(bee.width + LOCKUP_GAP + word.width, Math.max(bee.height, word.height));
  out.draw(bee, 0, Math.floor((out.height - bee.height) / 2));
  out.draw(word, bee.width + LOCKUP_GAP, Math.floor((out.height - word.height) / 2));
  return out;
}

/**
 * The hero's still frame: what the canvas shows first, drawn the way hero.js paints it.
 * @param {number} [time] seconds; the still frame's by default
 */
export function heroFrame(time = MOTION.stillTime) {
  const n = Math.round(time * MOTION.fps);
  const t = n / MOTION.fps;
  const frame = Math.floor((t * 1000) / MOTION.twinkleMs) % 2;
  const out = background(frame).clone();
  for (const dot of trailAt(MOTION.flight, MOTION.trail, t)) out.set(dot.x, dot.y, dot.color);
  const { x, y, facing } = beeAt(MOTION.flight, t);
  const sprite = beeFrames()[n % BEE.frames];
  if (facing === 1) out.draw(sprite, x - BEE.anchor[0], y - BEE.anchor[1]);
  else out.draw(sprite, x - (BEE.width - 1 - BEE.anchor[0]), y - BEE.anchor[1], { flipX: true });
  return out;
}

/** The hero's twinkle frames, stacked: what hero.js draws its background from. */
function heroBackgrounds() {
  const out = new Raster(SCENE.width, SCENE.height * 2);
  out.draw(background(0), 0, 0);
  out.draw(background(1), 0, SCENE.height);
  return out;
}

/** The bee's wing frames, side by side, facing right. */
function heroBees() {
  const frames = beeFrames();
  const out = new Raster(BEE.width * frames.length, BEE.height);
  frames.forEach((f, i) => out.draw(f, i * BEE.width, 0));
  return out;
}

/**
 * The box the bee's painted pixels fill over a whole loop, in scene pixels: [left, top, right,
 * bottom], inclusive. The page checks it stays in view however the art is cropped.
 * @returns {[number, number, number, number]}
 */
export function beeBox() {
  const frames = beeFrames();
  const box = /** @type {[number, number, number, number]} */ ([Infinity, Infinity, -Infinity, -Infinity]);
  const first = Math.round(MOTION.stillTime * MOTION.fps);
  for (let n = first; n < first + Math.round(MOTION.flight.period * MOTION.fps); n++) {
    const { x, y, facing } = beeAt(MOTION.flight, n / MOTION.fps);
    const sprite = frames[n % BEE.frames];
    for (let j = 0; j < sprite.height; j++) {
      for (let i = 0; i < sprite.width; i++) {
        if (sprite.get(i, j) === null) continue;
        const px = facing === 1 ? x - BEE.anchor[0] + i : x - (BEE.width - 1 - BEE.anchor[0]) + (BEE.width - 1 - i);
        const py = y - BEE.anchor[1] + j;
        box[0] = Math.min(box[0], px);
        box[1] = Math.min(box[1], py);
        box[2] = Math.max(box[2], px);
        box[3] = Math.max(box[3], py);
      }
    }
  }
  return box;
}

/** The data hero.js animates with, as a module. */
function heroData() {
  const data = {
    width: SCENE.width,
    height: SCENE.height,
    night: SCENE.night,
    fps: MOTION.fps,
    stillTime: Math.round(MOTION.stillTime * MOTION.fps) / MOTION.fps,
    background: { src: "/img/hero-bg.png", frames: 2, frameMs: MOTION.twinkleMs },
    bee: { src: "/img/hero-bee.png", width: BEE.width, height: BEE.height, frames: BEE.frames, anchor: BEE.anchor, box: beeBox() },
    flight: MOTION.flight,
    trail: MOTION.trail,
  };
  return [
    "// @ts-check",
    "// Generated by art/build.js from art/pieces/hero.js. Do not edit.",
    "",
    "/** The hero art's size, layers and motion, for hero.js. */",
    `export const HERO = ${JSON.stringify(data, null, 2)
      .replace(/"([a-zA-Z]+)":/g, "$1:")
      // Lists of numbers on one line: [216, 67].
      .replace(/\[\s+(-?[\d.]+(?:,\s+-?[\d.]+)*)\s+\]/g, (_, list) => `[${list.split(/,\s+/).join(", ")}]`)};`,
    "",
  ].join("\n");
}

/**
 * A window of the still frame, centered on the scene's focus point as far as the frame allows.
 * @param {number} width
 * @param {number} height
 * @param {[number, number]} [focus] fractions of the scene's size; the scene's focus by default
 */
function heroCrop(width, height, focus = SCENE.focus) {
  const still = heroFrame();
  const clamp = (/** @type {number} */ v, /** @type {number} */ max) => Math.max(0, Math.min(max, v));
  const x = clamp(Math.round(focus[0] * SCENE.width - width / 2), SCENE.width - width);
  const y = clamp(Math.round(focus[1] * SCENE.height - height / 2), SCENE.height - height);
  return still.crop(x, y, width, height);
}

/**
 * The link preview, 1200×630 at 5x: the right 240 columns of the scene, its top night rows
 * cropped, with the wordmark and the tagline on the calm sky. The scene's bee is the only bee: the
 * mark beside it would make two.
 */
function og() {
  const scene = heroFrame();
  const top = SCENE.height - 126;
  const art = scene.crop(SCENE.width - 240, top, 240, 126);
  const x = 16;
  art.draw(wordmark(), x, 26);
  art.draw(caption("INDIE GAMES,", C.wax), x, 54);
  const line = caption("CRAFTED WITH", C.wax);
  art.draw(line, x, 64);
  // The heart sits on the caption's baseline, a letter space after the last word.
  const glyph = heart();
  art.draw(glyph, x + line.width + 3, 64 + line.height - glyph.height);
  return art;
}

/**
 * A square icon: the mark centered on a tile of the page background.
 * @param {number} tile art pixels per side
 */
function tileIcon(tile) {
  return centered(mark(), tile, tile, C.hive);
}

/**
 * @typedef {{ path: string, raster: Raster, scale?: number }} PngOut
 * @typedef {{ path: string, svg: Raster, scale: number }} SvgOut
 * @typedef {{ path: string, ico: { size: number, raster: Raster }[] }} IcoOut
 * @typedef {{ path: string, text: string }} TextOut
 * @typedef {PngOut | SvgOut | IcoOut | TextOut} Output
 */

/** @returns {Output[]} every generated file, by repository path */
export function outputs() {
  const plain = lockup({ plainO: true });
  return [
    // Site: logos, as SVG at their display scale.
    { path: "site/img/mark.svg", svg: mark(), scale: 2 },
    { path: "site/img/logo.svg", svg: lockup(), scale: 2 },
    { path: "site/img/logo-small.svg", svg: plain, scale: 1 },
    { path: "site/img/ui/comb-full.svg", svg: combCell("full"), scale: 2 },
    { path: "site/img/ui/comb-half.svg", svg: combCell("half"), scale: 2 },
    { path: "site/img/ui/twinkle.svg", svg: twinkle(), scale: 4 },
    // Glyphs inside text, at 2x: the tagline's heart, the footer's heart, flag and peak.
    { path: "site/img/ui/heart.svg", svg: heart(), scale: 2 },
    { path: "site/img/ui/flag-fr.svg", svg: flagFrance(), scale: 2 },
    { path: "site/img/ui/mountain.svg", svg: mountain(), scale: 2 },
    // Site: icons. The 16px frame is drawn for its size, never downscaled.
    {
      path: "site/favicon.ico",
      ico: [
        { size: 16, raster: markSmall() },
        { size: 32, raster: mark() },
        { size: 48, raster: markSmall().scale(3) },
      ],
    },
    { path: "site/apple-touch-icon.png", raster: tileIcon(45), scale: 4 },
    { path: "site/img/icons/icon-192.png", raster: mark(), scale: 6 },
    { path: "site/img/icons/icon-512.png", raster: mark(), scale: 16 },
    { path: "site/img/icons/maskable-512.png", raster: tileIcon(64), scale: 8 },
    // Site: the hero, its animation layers and data, the link preview, the small art.
    { path: "site/img/hero.png", raster: heroFrame() },
    { path: "site/img/hero-bg.png", raster: heroBackgrounds() },
    { path: "site/img/hero-bee.png", raster: heroBees() },
    { path: "site/js/hero-data.js", text: heroData() },
    { path: "site/img/og.png", raster: og(), scale: 5 },
    { path: "site/img/lost.png", raster: lost() },
    { path: "site/img/next/draw-my-code-junior.png", raster: nextJunior() },
    { path: "site/img/next/truth-table-game.png", raster: nextTruthTable() },
    // Brand kit, for itch.io, stores and social pages (design/README.md, "Platforms").
    { path: "design/assets/mark-512.png", raster: mark(), scale: 16 },
    { path: "design/assets/mark-on-hive-512.png", raster: tileIcon(64), scale: 8 },
    { path: "design/assets/mark-16.png", raster: markSmall() },
    { path: "design/assets/avatar-400.png", raster: tileIcon(50), scale: 8 },
    { path: "design/assets/lockup-4x.png", raster: lockup(), scale: 4 },
    { path: "design/assets/lockup-small-2x.png", raster: plain, scale: 2 },
    { path: "design/assets/lockup-on-beeswax-4x.png", raster: centered(lockup({ ink: C["comb-black"], shade: null }), lockup().width + 16, lockup().height + 16, C.beeswax), scale: 4 },
    { path: "design/assets/wordmark-4x.png", raster: wordmark(), scale: 4 },
    { path: "design/assets/ui/comb-empty.svg", svg: combCell("empty"), scale: 2 },
    { path: "design/assets/ui/comb-half.svg", svg: combCell("half"), scale: 2 },
    { path: "design/assets/ui/comb-full.svg", svg: combCell("full"), scale: 2 },
    { path: "design/assets/ui/twinkle.svg", svg: twinkle(), scale: 2 },
    { path: "design/assets/hero-still-1x.png", raster: heroFrame() },
    { path: "design/assets/hero-1500x750.png", raster: heroFrame(), scale: 5 },
    { path: "design/assets/itch-banner-960x240.png", raster: heroCrop(240, 60), scale: 4 },
    { path: "design/assets/x-header-1500x500.png", raster: heroCrop(300, 100), scale: 5 },
    { path: "design/assets/discord-banner-960x540.png", raster: heroCrop(240, 135), scale: 4 },
  ];
}

/**
 * @param {Raster} raster
 * @param {string} path
 */
function checkPalette(raster, path) {
  for (const color of raster.colors()) {
    if (!PALETTE.has(color)) throw new Error(`${path}: ${color} is not a palette color`);
  }
}

/**
 * @param {Output} out
 * @returns {string | Buffer}
 */
function encode(out) {
  if ("text" in out) return out.text;
  if ("svg" in out) {
    checkPalette(out.svg, out.path);
    return svgOf(out.svg, { scale: out.scale });
  }
  if ("ico" in out) {
    for (const f of out.ico) {
      checkPalette(f.raster, out.path);
      if (f.raster.width !== f.size || f.raster.height !== f.size) throw new Error(`${out.path}: the ${f.size}px frame is ${f.raster.width}×${f.raster.height}`);
    }
    return encodeICO(out.ico.map((f) => ({ size: f.size, png: f.raster.png() })));
  }
  checkPalette(out.raster, out.path);
  return out.raster.png(out.scale ?? 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const root = (/** @type {string} */ path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
  const stale = [];
  for (const out of outputs()) {
    const content = encode(out);
    if (await isFresh(out.path, content)) continue;
    if (check) stale.push(out.path);
    else {
      await mkdir(dirname(root(out.path)), { recursive: true });
      await writeFile(root(out.path), content);
      console.log(`wrote ${out.path}`);
    }
  }
  if (stale.length) {
    console.error(`Stale, run npm run generate: ${stale.join(", ")}`);
    process.exit(1);
  }
}
