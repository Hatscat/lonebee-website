// @ts-check
/**
 * ICO files made of PNG frames, which every browser since Internet Explorer 9 reads. Browsers pick
 * the frame closest to the size they draw, so a hand-drawn 16×16 frame shows in 16px tab icons
 * instead of a blurry downscale of the 32×32 one.
 */
import { decodePNG } from "./png.js";

/**
 * @param {{ size: number, png: Buffer }[]} frames square frames, 1 to 256 pixels
 * @returns {Buffer}
 */
export function encodeICO(frames) {
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1: icon
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, png }, i) => {
    if (size < 1 || size > 256) throw new Error(`encodeICO: bad size ${size}`);
    const decoded = decodePNG(png);
    if (decoded.width !== size || decoded.height !== size) {
      throw new Error(`encodeICO: frame ${i} is ${decoded.width}×${decoded.height}, not ${size}×${size}`);
    }
    const entry = 6 + 16 * i;
    header[entry] = size % 256; // 0 means 256
    header[entry + 1] = size % 256;
    header[entry + 2] = 0; // no color table
    header[entry + 3] = 0; // reserved
    header.writeUInt16LE(1, entry + 4); // color planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...frames.map((f) => f.png)]);
}

/**
 * @param {Uint8Array} file
 * @returns {{ size: number, png: Buffer }[]}
 */
export function decodeICO(file) {
  const buf = Buffer.from(file.buffer, file.byteOffset, file.byteLength);
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error("decodeICO: not an icon");
  const count = buf.readUInt16LE(4);
  return Array.from({ length: count }, (_, i) => {
    const entry = 6 + 16 * i;
    const length = buf.readUInt32LE(entry + 8);
    const offset = buf.readUInt32LE(entry + 12);
    return { size: buf[entry] || 256, png: buf.subarray(offset, offset + length) };
  });
}
