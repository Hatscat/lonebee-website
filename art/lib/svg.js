// @ts-check
/**
 * Pixel art as SVG: one path per color, built from rectangles that merge runs of equal pixels
 * across rows, with crispEdges so pixels stay square at any size. The viewBox counts art pixels.
 */

/**
 * @param {import("./raster.js").Raster} raster
 * @param {{ scale?: number, label?: string }} [options] scale: the width and height attributes in
 *   CSS pixels per art pixel; label: an accessible name, for an SVG used inline
 * @returns {string}
 */
export function svgOf(raster, { scale = 1, label } = {}) {
  /** @type {Map<string, string[]>} */
  const paths = new Map();
  /** @type {Map<string, { x: number, y: number, w: number, h: number }>} open rectangles by "color x w" */
  let open = new Map();
  /** @param {{ x: number, y: number, w: number, h: number }} r @param {string} color */
  const close = (r, color) => {
    if (!paths.has(color)) paths.set(color, []);
    /** @type {string[]} */ (paths.get(color)).push(`M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`);
  };
  for (let y = 0; y <= raster.height; y++) {
    /** @type {Map<string, { x: number, y: number, w: number, h: number }>} */
    const next = new Map();
    for (let x = 0; y < raster.height && x < raster.width; ) {
      const color = raster.get(x, y);
      let end = x + 1;
      while (end < raster.width && raster.get(end, y) === color) end++;
      if (color !== null) {
        const key = `${color} ${x} ${end - x}`;
        const above = open.get(key);
        if (above) {
          above.h += 1;
          open.delete(key);
          next.set(key, above);
        } else next.set(key, { x, y, w: end - x, h: 1 });
      }
      x = end;
    }
    for (const [key, r] of open) close(r, key.split(" ")[0]);
    open = next;
  }
  const colors = [...paths.keys()].sort();
  const a11y = label ? ` role="img" aria-label="${escapeXml(label)}"` : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${raster.width} ${raster.height}" width="${raster.width * scale}" height="${raster.height * scale}" shape-rendering="crispEdges"${a11y}>`,
    ...colors.map((c) => `<path fill="${c}" d="${/** @type {string[]} */ (paths.get(c)).join("")}"/>`),
    "</svg>",
    "",
  ].join("\n");
}

/** @param {string} text */
function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
