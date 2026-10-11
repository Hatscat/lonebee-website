// @ts-check
/**
 * Bitmap fonts: each glyph is a text grid where "#" is ink and "." is empty, all glyphs of a font
 * share one height, and widths may vary. Used for the wordmark and for text inside images, which
 * must be pixels of the art rather than live text.
 */
import { Raster } from "./raster.js";

/**
 * @typedef {{ height: number, spacing: number, glyphs: Map<string, boolean[][]> }} Font
 */

/**
 * @param {{ spacing?: number, glyphs: Record<string, string> }} spec spacing: empty columns
 *   between letters; glyphs: character → rows of "#" and ".", separated by newlines or "|"
 * @returns {Font}
 */
export function bitmapFont({ spacing = 1, glyphs }) {
  /** @type {Map<string, boolean[][]>} */
  const map = new Map();
  let height = 0;
  for (const [ch, text] of Object.entries(glyphs)) {
    const rows = text.split(/[\n|]/).map((row) => row.trim()).filter((row) => row !== "");
    const width = rows[0]?.length ?? 0;
    if (rows.some((row) => row.length !== width || /[^#.]/.test(row))) {
      throw new Error(`bitmapFont: glyph "${ch}" must be a rectangle of "#" and "."`);
    }
    if (height && rows.length !== height) throw new Error(`bitmapFont: glyph "${ch}" is ${rows.length} tall, not ${height}`);
    height = rows.length;
    map.set(ch, rows.map((row) => [...row].map((c) => c === "#")));
  }
  return { height, spacing, glyphs: map };
}

/**
 * @param {Font} font
 * @param {string} text
 */
export function textWidth(font, text) {
  let width = 0;
  [...text].forEach((ch, i) => {
    width += glyph(font, ch)[0].length + (i > 0 ? font.spacing : 0);
  });
  return width;
}

/**
 * Draws text with its top-left corner at (x, y).
 * @param {Raster} raster
 * @param {Font} font
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} color
 */
export function drawText(raster, font, text, x, y, color) {
  let cx = x;
  for (const ch of text) {
    const rows = glyph(font, ch);
    rows.forEach((row, j) => row.forEach((ink, i) => ink && raster.set(cx + i, y + j, color)));
    cx += rows[0].length + font.spacing;
  }
  return raster;
}

/**
 * Text as its own raster, transparent around the ink.
 * @param {Font} font
 * @param {string} text
 * @param {string} color
 */
export function textRaster(font, text, color) {
  return drawText(new Raster(Math.max(1, textWidth(font, text)), font.height), font, text, 0, 0, color);
}

/**
 * @param {Font} font
 * @param {string} ch
 */
function glyph(font, ch) {
  const rows = font.glyphs.get(ch);
  if (!rows) throw new Error(`bitmapFont: no glyph for "${ch}"`);
  return rows;
}
