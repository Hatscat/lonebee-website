// @ts-check
/**
 * PNG encoder and decoder on node:zlib, so the art needs no dependency.
 *
 * The encoder writes an indexed PNG, at the smallest bit depth that fits, whenever the image has
 * at most 256 colors (pixel art always does), and 8-bit RGBA otherwise. It writes no ancillary
 * chunk: the bytes depend on the pixels alone. Fully transparent pixels all become one palette
 * entry, whatever their RGB.
 *
 * The decoder reads non-interlaced PNGs of every color type at bit depths 1 to 8: enough for the
 * files this project writes, which the freshness check compares pixel by pixel (deflate output may
 * differ between zlib versions, decoded pixels never do).
 */
import { crc32, deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * @param {string} type four ASCII letters
 * @param {Uint8Array} data
 */
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "latin1");
  Buffer.from(data.buffer, data.byteOffset, data.byteLength).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)) >>> 0, 8 + data.length);
  return out;
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} bitDepth
 * @param {number} colorType
 */
function ihdr(width, height, bitDepth, colorType) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = bitDepth;
  data[9] = colorType;
  return chunk("IHDR", data); // compression, filter and interlace stay 0
}

/**
 * The image's colors as palette entries, or null past 256. Entries that are not fully opaque come
 * first, so the tRNS chunk stays as short as possible; otherwise, order of first appearance.
 * @param {Uint8Array} rgba
 * @returns {{ entries: number[], index: Map<number, number> } | null}
 */
function paletteOf(rgba) {
  /** @type {number[]} */
  const seen = [];
  const known = new Set();
  for (let i = 0; i < rgba.length; i += 4) {
    const key = rgba[i + 3] === 0 ? 0 : packed(rgba, i);
    if (known.has(key)) continue;
    if (known.size === 256) return null;
    known.add(key);
    seen.push(key);
  }
  const entries = [...seen.filter((c) => (c & 0xff) !== 0xff), ...seen.filter((c) => (c & 0xff) === 0xff)];
  return { entries, index: new Map(entries.map((c, i) => [c, i])) };
}

/**
 * @param {Uint8Array} rgba
 * @param {number} i byte offset of a pixel
 */
function packed(rgba, i) {
  return ((rgba[i] << 24) | (rgba[i + 1] << 16) | (rgba[i + 2] << 8) | rgba[i + 3]) >>> 0;
}

/**
 * Filters one scanline with each of the five PNG filters and keeps the one with the smallest sum
 * of absolute values, the heuristic the PNG specification recommends for truecolor images.
 * @param {Uint8Array} row
 * @param {Uint8Array} prev the previous raw scanline (zeros for the first)
 * @param {number} bpp bytes per pixel
 */
function filterRow(row, prev, bpp) {
  let best = Buffer.alloc(0);
  let bestScore = Infinity;
  for (let type = 0; type <= 4; type++) {
    const out = Buffer.alloc(row.length + 1);
    out[0] = type;
    let score = 0;
    for (let i = 0; i < row.length; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      const predictor = type === 0 ? 0 : type === 1 ? a : type === 2 ? b : type === 3 ? (a + b) >> 1 : paeth(a, b, c);
      const value = (row[i] - predictor) & 0xff;
      out[i + 1] = value;
      score += value < 128 ? value : 256 - value;
    }
    if (score < bestScore) {
      bestScore = score;
      best = out;
    }
  }
  return best;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} c
 */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} rgba width × height × 4 bytes, row by row
 * @returns {Buffer}
 */
export function encodePNG(width, height, rgba) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`encodePNG: bad size ${width}×${height}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new Error(`encodePNG: ${rgba.length} bytes for ${width}×${height} pixels`);
  }
  const palette = paletteOf(rgba);
  if (palette) {
    const n = palette.entries.length;
    const bitDepth = n <= 2 ? 1 : n <= 4 ? 2 : n <= 16 ? 4 : 8;
    const rowBytes = Math.ceil((width * bitDepth) / 8);
    // Filter type 0 everywhere: the specification's advice for indexed images.
    const raw = Buffer.alloc((rowBytes + 1) * height);
    for (let y = 0; y < height; y++) {
      const start = y * (rowBytes + 1) + 1;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const value = /** @type {number} */ (palette.index.get(rgba[i + 3] === 0 ? 0 : packed(rgba, i)));
        const bit = x * bitDepth;
        raw[start + (bit >> 3)] |= value << (8 - bitDepth - (bit & 7));
      }
    }
    const plte = Buffer.alloc(n * 3);
    palette.entries.forEach((c, i) => {
      plte[i * 3] = c >>> 24;
      plte[i * 3 + 1] = (c >>> 16) & 0xff;
      plte[i * 3 + 2] = (c >>> 8) & 0xff;
    });
    const alphas = palette.entries.filter((c) => (c & 0xff) !== 0xff).map((c) => c & 0xff);
    return Buffer.concat([
      SIGNATURE,
      ihdr(width, height, bitDepth, 3),
      chunk("PLTE", plte),
      ...(alphas.length ? [chunk("tRNS", Buffer.from(alphas))] : []),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
  const rows = [];
  let prev = new Uint8Array(width * 4);
  for (let y = 0; y < height; y++) {
    const row = rgba.subarray(y * width * 4, (y + 1) * width * 4);
    rows.push(filterRow(row, prev, 4));
    prev = row;
  }
  return Buffer.concat([
    SIGNATURE,
    ihdr(width, height, 8, 6),
    chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * @param {Uint8Array} file
 * @returns {{ width: number, height: number, rgba: Uint8Array }}
 */
export function decodePNG(file) {
  const buf = Buffer.from(file.buffer, file.byteOffset, file.byteLength);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("decodePNG: not a PNG");
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  /** @type {Buffer | null} */
  let plte = null;
  /** @type {Buffer | null} */
  let trns = null;
  const idat = [];
  for (let at = 8; at < buf.length; ) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + length);
    if ((crc32(buf.subarray(at + 4, at + 8 + length)) >>> 0) !== buf.readUInt32BE(at + 8 + length)) {
      throw new Error(`decodePNG: bad CRC in ${type}`);
    }
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error("decodePNG: interlaced PNGs are not supported");
      if (bitDepth > 8) throw new Error("decodePNG: 16-bit PNGs are not supported");
    } else if (type === "PLTE") plte = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    at += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`decodePNG: unknown color type ${colorType}`);
  const bitsPerPixel = channels * bitDepth;
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const rowBytes = Math.ceil((width * bitsPerPixel) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(rowBytes);
  for (let y = 0; y < height; y++) {
    const type = raw[y * (rowBytes + 1)];
    const row = new Uint8Array(raw.subarray(y * (rowBytes + 1) + 1, (y + 1) * (rowBytes + 1)));
    for (let i = 0; i < rowBytes; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      const predictor = type === 0 ? 0 : type === 1 ? a : type === 2 ? b : type === 3 ? (a + b) >> 1 : paeth(a, b, c);
      row[i] = (row[i] + predictor) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      /** @param {number} k the k-th sample of this pixel */
      const sample = (k) => {
        if (bitDepth === 8) return row[x * channels + k];
        const bit = (x * channels + k) * bitDepth;
        return (row[bit >> 3] >> (8 - bitDepth - (bit & 7))) & ((1 << bitDepth) - 1);
      };
      const scale = colorType === 3 ? 1 : 255 / ((1 << bitDepth) - 1);
      if (colorType === 3) {
        const i = sample(0);
        if (!plte || i * 3 + 2 >= plte.length) throw new Error("decodePNG: palette index out of range");
        rgba[o] = plte[i * 3];
        rgba[o + 1] = plte[i * 3 + 1];
        rgba[o + 2] = plte[i * 3 + 2];
        rgba[o + 3] = trns && i < trns.length ? trns[i] : 255;
      } else if (colorType === 0 || colorType === 4) {
        const g = Math.round(sample(0) * scale);
        rgba[o] = rgba[o + 1] = rgba[o + 2] = g;
        rgba[o + 3] = colorType === 4 ? sample(1) : trns && trns.readUInt16BE(0) === sample(0) ? 0 : 255;
      } else {
        rgba[o] = sample(0);
        rgba[o + 1] = sample(1);
        rgba[o + 2] = sample(2);
        const opaque = !(trns && colorType === 2 && trns.readUInt16BE(0) === rgba[o] && trns.readUInt16BE(2) === rgba[o + 1] && trns.readUInt16BE(4) === rgba[o + 2]);
        rgba[o + 3] = colorType === 6 ? sample(3) : opaque ? 255 : 0;
      }
    }
    prev = row;
  }
  return { width, height, rgba };
}
