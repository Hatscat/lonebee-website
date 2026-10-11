// @ts-check
/**
 * design/tokens.json is the one source of every design value. This script checks it and writes
 * what is derived from it:
 *
 * - site/css/tokens.css: one custom property per token, of the same name, plus @font-face rules
 *   and one `--type-<style>` font shorthand per type style;
 * - design/palette/: the palette for pixel art tools: lonebee.gpl (GIMP, Pixelorama, Aseprite,
 *   Krita), lonebee.hex (Lospec) and lonebee-1x.png / lonebee-32x.png (one pixel, or one 32px
 *   square, per color; Pixelorama and Aseprite import both).
 *
 * The file follows the Design System artifact's format (lists of {name, value, usage}), so it can
 * be published to the artifact as it is. Extra keys the artifact page ignores but keeps:
 * `meta.ramps` (palette order) and `meta.contrast` (text pairs that must stay legible), plus the
 * `duration` and `easing` families.
 *
 * `--check` writes nothing and fails when an output on disk differs from what it would write.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeICO } from "../art/lib/ico.js";
import { decodePNG } from "../art/lib/png.js";
import { Raster } from "../art/lib/raster.js";

const root = (/** @type {string} */ path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

/**
 * @typedef {{ name: string, value: string | Record<string, string>, usage?: string }} Token
 * @typedef {{ name: string, fontSize: string, lineHeight?: string | number, fontWeight?: number | string,
 *   letterSpacing?: string, family?: string, sample?: string, usage?: string }} TypeStyle
 * @typedef {{ name: string, title?: string, version?: number,
 *   meta?: { ramps?: { name: string, colors: string[] }[], contrast?: { fg: string, bg: string, min: number, note?: string }[] },
 *   color: { themes: { id: string, name: string }[], tokens: Token[] },
 *   type: { fonts: { family: string, file: string, weight: string, style?: string }[], families: Record<string, string>,
 *     groups: { name: string, family: string, styles: TypeStyle[] }[] },
 *   [family: string]: unknown }} Tokens
 */

const NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const HEX = /^#[0-9a-f]{6}$/;
const ALIAS = /^\{([A-Za-z0-9][A-Za-z0-9_-]{0,63})\}$/;

/** The families written as plain custom properties, in this order. */
const PLAIN_FAMILIES = ["spacing", "size", "border", "radius", "shadow", "layout", "layer", "duration", "easing"];

/** @param {string} message */
function fail(message) {
  throw new Error(`design/tokens.json: ${message}`);
}

/**
 * @param {Tokens} t
 * @returns {{ palette: Map<string, string>, resolve: (name: string) => string }}
 */
export function checkTokens(t) {
  const seen = new Set();
  /** @param {string} name @param {string} where */
  const claim = (name, where) => {
    if (!NAME.test(name)) fail(`${where}: bad name "${name}"`);
    if (seen.has(name)) fail(`${where}: "${name}" is defined twice`);
    seen.add(name);
  };
  if (!Array.isArray(t.color?.themes) || t.color.themes.length !== 1) fail("color.themes: the site has exactly one theme");
  const theme = t.color.themes[0].id;
  /** @type {Map<string, string>} */
  const palette = new Map();
  /** @type {Map<string, string>} */
  const aliases = new Map();
  for (const token of t.color.tokens) {
    claim(token.name, "color");
    if (!token.usage) fail(`color: "${token.name}" has no usage note`);
    const value = typeof token.value === "string" ? token.value : token.value[theme];
    if (HEX.test(value)) palette.set(token.name, value);
    else if (ALIAS.test(value)) aliases.set(token.name, value.slice(1, -1));
    else fail(`color: "${token.name}" must be a lowercase #rrggbb palette color or a {palette-alias}, not ${value}`);
  }
  for (const [name, target] of aliases) {
    if (!palette.has(target)) fail(`color: "${name}" aliases "${target}", which is not a palette color (no alias chains)`);
  }
  // A limited palette earns every slot: two colors closer than this (OKLab distance) would read as
  // one in the art. The closest pairs on purpose are warm and cool darks (hive and night, 0.047).
  const entries = [...palette.entries()];
  entries.forEach(([a, hexA], i) => {
    for (const [b, hexB] of entries.slice(i + 1)) {
      const distance = oklabDistance(hexA, hexB);
      if (distance < MIN_DISTANCE) fail(`color: "${a}" and "${b}" are nearly the same color (${distance.toFixed(3)})`);
    }
  });
  const ramps = t.meta?.ramps ?? [];
  const inRamps = ramps.flatMap((r) => r.colors);
  for (const name of inRamps) if (!palette.has(name)) fail(`meta.ramps: "${name}" is not a palette color`);
  for (const name of palette.keys()) if (!inRamps.includes(name)) fail(`meta.ramps: palette color "${name}" is in no ramp`);
  if (new Set(inRamps).size !== inRamps.length) fail("meta.ramps: a color is in two ramps");

  for (const [family, stack] of Object.entries(t.type.families)) {
    if (!NAME.test(family)) fail(`type.families: bad key "${family}"`);
    if (/[;{}<>\\()]/.test(stack)) fail(`type.families.${family}: no functions or braces in a font stack`);
    // The brand's face leads each stack: a typo there would fall back silently on every page.
    const first = stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (!t.type.fonts.some((f) => f.family === first)) fail(`type.families.${family}: "${first}" is not a family of type.fonts`);
  }
  for (const group of t.type.groups) {
    if (!(group.family in t.type.families)) fail(`type.groups.${group.name}: unknown family "${group.family}"`);
    for (const style of group.styles) {
      claim(`type-${style.name}`, `type style ${style.name}`);
      if (style.family && !(style.family in t.type.families)) fail(`type style ${style.name}: unknown family "${style.family}"`);
      if (!/^\d+(\.\d+)?px$/.test(style.fontSize)) fail(`type style ${style.name}: fontSize must be in px`);
      if (!style.usage) fail(`type style ${style.name}: no usage note`);
    }
  }
  for (const family of PLAIN_FAMILIES) {
    const list = /** @type {{ tokens?: Token[] } | undefined} */ (t[family]);
    for (const token of list?.tokens ?? []) {
      claim(token.name, family);
      if (!token.usage) fail(`${family}: "${token.name}" has no usage note`);
      if (typeof token.value !== "string" || /[;{}<>\\]|var\(|url\(/.test(token.value)) fail(`${family}: "${token.name}" has a bad value`);
      // Shadows hold literal colors (the artifact's format allows no var() there): palette ones only.
      for (const hex of token.value.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        if (![...palette.values()].includes(hex)) fail(`${family}: "${token.name}" uses ${hex}, which is not a palette color`);
      }
    }
  }
  /** @param {string} name */
  const resolve = (name) => palette.get(name) ?? palette.get(aliases.get(name) ?? "") ?? fail(`unknown color "${name}"`);
  for (const pair of t.meta?.contrast ?? []) {
    const ratio = contrast(resolve(pair.fg), resolve(pair.bg));
    if (ratio + 1e-9 < pair.min) fail(`meta.contrast: ${pair.fg} on ${pair.bg} is ${ratio.toFixed(2)}:1, under ${pair.min}:1`);
  }
  return { palette, resolve };
}

const MIN_DISTANCE = 0.045;

/**
 * Euclidean distance of two "#rrggbb" colors in OKLab, where 0.02 is about a just-noticeable
 * difference.
 * @param {string} a
 * @param {string} b
 */
export function oklabDistance(a, b) {
  /** @param {string} hex */
  const oklab = (hex) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  const [p, q] = [oklab(a), oklab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * WCAG 2 contrast ratio of two "#rrggbb" colors.
 * @param {string} a
 * @param {string} b
 */
export function contrast(a, b) {
  /** @param {string} hex */
  const luminance = (hex) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * @param {Tokens} t
 * @returns {Map<string, string | Buffer>} output path → content
 */
export function outputs(t) {
  const { palette } = checkTokens(t);
  const theme = t.color.themes[0].id;
  const lines = [`/* ${t.name} — generated from design/tokens.json by scripts/tokens.js. Do not edit. */`, ""];
  for (const font of t.type.fonts) {
    const file = font.file.replace(/^fonts\//, "");
    lines.push(
      "@font-face {",
      `  font-family: "${font.family}";`,
      `  src: url("/fonts/${file}") format("woff2");`,
      `  font-weight: ${font.weight};`,
      `  font-style: ${font.style ?? "normal"};`,
      "  font-display: swap;",
      "}",
      "",
    );
  }
  lines.push(":root {", "  color-scheme: dark;");
  for (const token of t.color.tokens) {
    const value = typeof token.value === "string" ? token.value : token.value[theme];
    lines.push(`  --${token.name}: ${ALIAS.test(value) ? `var(--${value.slice(1, -1)})` : value};`);
  }
  for (const [family, stack] of Object.entries(t.type.families)) lines.push(`  --font-${family}: ${stack};`);
  for (const group of t.type.groups) {
    for (const s of group.styles) {
      const weight = s.fontWeight ?? 400;
      const leading = s.lineHeight ?? "normal";
      lines.push(`  --type-${s.name}: ${weight} ${s.fontSize}/${leading} var(--font-${s.family ?? group.family});`);
      lines.push(`  --type-${s.name}-tracking: ${s.letterSpacing ?? "normal"};`);
    }
  }
  for (const family of PLAIN_FAMILIES) {
    const list = /** @type {{ tokens?: Token[] } | undefined} */ (t[family]);
    for (const token of list?.tokens ?? []) lines.push(`  --${token.name}: ${token.value};`);
  }
  lines.push("}", "");

  const ordered = (t.meta?.ramps ?? []).flatMap((r) => r.colors.map((name) => ({ name, hex: /** @type {string} */ (palette.get(name)) })));
  const gpl = [
    "GIMP Palette",
    `Name: ${t.name}`,
    `Columns: ${Math.max(...(t.meta?.ramps ?? []).map((r) => r.colors.length))}`,
    "#",
    ...ordered.map(({ name, hex }) => {
      const [r, g, b] = [1, 3, 5].map((i) => String(parseInt(hex.slice(i, i + 2), 16)).padStart(3));
      return `${r} ${g} ${b}\t${name}`;
    }),
    "",
  ].join("\n");
  const one = new Raster(ordered.length, 1);
  ordered.forEach(({ hex }, i) => one.set(i, 0, hex));
  const ramps = t.meta?.ramps ?? [];
  const sheet = new Raster(Math.max(...ramps.map((r) => r.colors.length)), ramps.length);
  ramps.forEach((r, y) => r.colors.forEach((name, x) => sheet.set(x, y, /** @type {string} */ (palette.get(name)))));
  return new Map([
    ["site/css/tokens.css", lines.join("\n")],
    ["design/palette/lonebee.gpl", gpl],
    ["design/palette/lonebee.hex", ordered.map(({ hex }) => hex.slice(1)).join("\n") + "\n"],
    ["design/palette/lonebee-1x.png", one.png()],
    ["design/palette/lonebee-32x.png", sheet.png(32)],
  ]);
}

/**
 * Whether a file on disk holds what would be written: text byte for byte, PNG and ICO images
 * pixel for pixel (their compressed bytes may differ between zlib versions, their pixels never).
 * @param {string} path relative to the repository
 * @param {string | Buffer} content
 */
export async function isFresh(path, content) {
  let disk;
  try {
    disk = await readFile(root(path));
  } catch {
    return false;
  }
  if (typeof content === "string") return disk.toString("utf8") === content;
  /** @param {Uint8Array} a @param {Uint8Array} b */
  const samePixels = (a, b) => {
    const [x, y] = [decodePNG(a), decodePNG(b)];
    return x.width === y.width && x.height === y.height && Buffer.from(x.rgba).equals(Buffer.from(y.rgba));
  };
  try {
    if (path.endsWith(".png")) return samePixels(disk, content);
    if (path.endsWith(".ico")) {
      const [x, y] = [decodeICO(disk), decodeICO(content)];
      return x.length === y.length && x.every((f, i) => f.size === y[i].size && samePixels(f.png, y[i].png));
    }
  } catch {
    return false; // an unreadable file on disk is stale
  }
  return disk.equals(content);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const tokens = /** @type {Tokens} */ (JSON.parse(await readFile(root("design/tokens.json"), "utf8")));
  const stale = [];
  for (const [path, content] of outputs(tokens)) {
    if (await isFresh(path, content)) continue;
    if (check) stale.push(path);
    else {
      await mkdir(dirname(root(path)), { recursive: true });
      await writeFile(root(path), content);
      console.log(`wrote ${path}`);
    }
  }
  if (stale.length) {
    console.error(`Stale, run npm run generate: ${stale.join(", ")}`);
    process.exit(1);
  }
}
