// @ts-check
/**
 * Sprites written as text: one character per pixel, a legend mapping characters to colors, "." for
 * transparent. Hand-placed pixels stay readable and diffable in code review.
 */
import { Raster } from "./raster.js";

/**
 * @param {string} text rows of equal length; blank lines and the indentation of the first row are
 *   ignored, so a template literal can be indented with the code
 * @param {Record<string, string | null>} legend character → "#rrggbb" (or null); "." is transparent
 * @returns {Raster}
 */
export function sprite(text, legend) {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const indent = Math.min(...lines.map((line) => line.length - line.trimStart().length));
  const rows = lines.map((line) => line.slice(indent).trimEnd());
  const width = Math.max(...rows.map((row) => row.length));
  const out = new Raster(width, rows.length);
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`sprite: row ${y} is ${row.length} wide, not ${width}: ${row}`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      if (!(ch in legend)) throw new Error(`sprite: "${ch}" at ${x},${y} is not in the legend`);
      out.set(x, y, legend[ch]);
    });
  });
  return out;
}

/**
 * The inverse of sprite(), for debugging and for checking art into tests.
 * @param {Raster} raster
 * @param {Record<string, string | null>} legend
 */
export function spriteText(raster, legend) {
  const byColor = new Map(Object.entries(legend).map(([ch, color]) => [color, ch]));
  const rows = [];
  for (let y = 0; y < raster.height; y++) {
    let row = "";
    for (let x = 0; x < raster.width; x++) {
      const color = raster.get(x, y);
      row += color === null ? "." : (byColor.get(color) ?? "?");
    }
    rows.push(row);
  }
  return rows.join("\n");
}
