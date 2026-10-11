// @ts-check
/**
 * A pixel canvas for drawing art in code. Colors are "#rrggbb" strings, or null for a transparent
 * pixel: there is no partial transparency and no blending, so every pixel of an output is exactly
 * a palette color or nothing. Shapes are drawn the way a pixel artist would draw them by hand:
 * Bresenham lines, midpoint circles and ellipses, and ordered (Bayer) dithering for gradients.
 */
import { encodePNG } from "./png.js";

/** @typedef {string | null} Color "#rrggbb", or null for transparent */

const HEX = /^#[0-9a-f]{6}$/;

/** 4×4 Bayer matrix: the threshold order of ordered dithering. */
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export class Raster {
  /**
   * @param {number} width
   * @param {number} height
   * @param {Color} [fill]
   */
  constructor(width, height, fill = null) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new Error(`Raster: bad size ${width}×${height}`);
    }
    this.width = width;
    this.height = height;
    /** @type {Color[]} */
    this.pixels = new Array(width * height).fill(checkColor(fill));
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {Color} null outside the raster, like a transparent pixel
   */
  get(x, y) {
    if (!this.inside(x, y)) return null;
    return this.pixels[y * this.width + x];
  }

  /**
   * Sets one pixel; coordinates outside the raster are ignored, so shapes may overflow its edges.
   * @param {number} x
   * @param {number} y
   * @param {Color} color
   */
  set(x, y, color) {
    if (this.inside(x, y)) this.pixels[y * this.width + x] = checkColor(color);
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  inside(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {Color} color
   */
  rect(x, y, w, h, color) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color);
    return this;
  }

  /**
   * A one-pixel Bresenham line, both ends included.
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @param {Color} color
   */
  line(x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let x = x0, y = y0; ; ) {
      this.set(x, y, color);
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
    return this;
  }

  /**
   * An axis-aligned ellipse centered on a pixel, from the integer test (x/rx)² + (y/ry)² ≤ 1 with a
   * half-pixel bias, which gives the round, symmetric shapes pixel artists draw by hand.
   * @param {number} cx
   * @param {number} cy
   * @param {number} rx
   * @param {number} ry
   * @param {Color} color
   * @param {{ outline?: boolean }} [options] outline: only the edge pixels
   */
  ellipse(cx, cy, rx, ry, color, { outline = false } = {}) {
    /** @param {number} i @param {number} j */
    const within = (i, j) => (i * i) / ((rx + 0.5) * (rx + 0.5)) + (j * j) / ((ry + 0.5) * (ry + 0.5)) <= 1;
    for (let j = -ry; j <= ry; j++) {
      for (let i = -rx; i <= rx; i++) {
        if (!within(i, j)) continue;
        const edge = !within(i - 1, j) || !within(i + 1, j) || !within(i, j - 1) || !within(i, j + 1);
        if (!outline || edge) this.set(cx + i, cy + j, color);
      }
    }
    return this;
  }

  /**
   * @param {number} cx
   * @param {number} cy
   * @param {number} r
   * @param {Color} color
   * @param {{ outline?: boolean }} [options]
   */
  circle(cx, cy, r, color, options) {
    return this.ellipse(cx, cy, r, r, color, options);
  }

  /**
   * Fills a polygon by scanlines, even-odd rule, sampling each pixel at its center.
   * @param {[number, number][]} points
   * @param {Color} color
   */
  polygon(points, color) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const sy = y + 0.5;
      /** @type {number[]} */
      const xs = [];
      points.forEach(([x0, y0], i) => {
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
      });
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, color);
      }
    }
    return this;
  }

  /**
   * Ordered dithering between two colors: share 0 paints all `a`, share 16 all `b`, and every step
   * between mixes them in the Bayer pattern, so a gradient stays crisp pixel art.
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {Color} a
   * @param {Color} b
   * @param {(i: number, j: number) => number} share 0 to 16 for the pixel at (x + i, y + j)
   */
  dither(x, y, w, h, a, b, share) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const px = x + i;
        const py = y + j;
        const threshold = BAYER4[((py % 4) + 4) % 4][((px % 4) + 4) % 4];
        this.set(px, py, threshold < share(i, j) ? b : a);
      }
    }
    return this;
  }

  /**
   * Draws another raster on this one; its transparent pixels leave this one's untouched.
   * @param {Raster} src
   * @param {number} dx
   * @param {number} dy
   * @param {{ flipX?: boolean, flipY?: boolean }} [options]
   */
  draw(src, dx, dy, { flipX = false, flipY = false } = {}) {
    for (let j = 0; j < src.height; j++) {
      for (let i = 0; i < src.width; i++) {
        const color = src.get(flipX ? src.width - 1 - i : i, flipY ? src.height - 1 - j : j);
        if (color !== null) this.set(dx + i, dy + j, color);
      }
    }
    return this;
  }

  /**
   * Replaces every pixel of one color with another (a palette swap).
   * @param {Color} from
   * @param {Color} to
   */
  swap(from, to) {
    const target = checkColor(to);
    this.pixels = this.pixels.map((c) => (c === from ? target : c));
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  crop(x, y, w, h) {
    const out = new Raster(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.pixels[j * w + i] = this.get(x + i, y + j);
    return out;
  }

  /**
   * Nearest-neighbor enlargement by a whole factor: every pixel becomes a factor × factor block.
   * @param {number} factor
   */
  scale(factor) {
    if (!Number.isInteger(factor) || factor < 1) throw new Error(`Raster.scale: ${factor} is not a whole factor`);
    const out = new Raster(this.width * factor, this.height * factor);
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        out.pixels[y * out.width + x] = this.pixels[Math.floor(y / factor) * this.width + Math.floor(x / factor)];
      }
    }
    return out;
  }

  clone() {
    const out = new Raster(this.width, this.height);
    out.pixels = [...this.pixels];
    return out;
  }

  /** @returns {Set<string>} every color used, transparent excluded */
  colors() {
    return new Set(/** @type {string[]} */ (this.pixels.filter((c) => c !== null)));
  }

  /** @returns {Uint8Array} */
  rgba() {
    const out = new Uint8Array(this.width * this.height * 4);
    this.pixels.forEach((c, i) => {
      if (c === null) return;
      out[i * 4] = parseInt(c.slice(1, 3), 16);
      out[i * 4 + 1] = parseInt(c.slice(3, 5), 16);
      out[i * 4 + 2] = parseInt(c.slice(5, 7), 16);
      out[i * 4 + 3] = 255;
    });
    return out;
  }

  /** @param {number} [factor] whole-number enlargement */
  png(factor = 1) {
    const r = factor === 1 ? this : this.scale(factor);
    return encodePNG(r.width, r.height, r.rgba());
  }
}

/**
 * @param {Color} color
 * @returns {Color}
 */
function checkColor(color) {
  if (color !== null && !HEX.test(color)) throw new Error(`Raster: bad color ${JSON.stringify(color)}, use "#rrggbb"`);
  return color;
}
