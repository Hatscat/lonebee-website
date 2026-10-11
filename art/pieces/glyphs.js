// @ts-check
/**
 * Pixel glyphs that sit inside text, where an emoji would otherwise go: they keep the brand's
 * palette and look the same on every system (Windows, for one, draws the French flag emoji as the
 * letters "FR"). Shown at 2x, beside 14 to 20px text. Like the rest of the interface layer, they
 * are lit from the upper left.
 */
import { C } from "../palette.js";
import { sprite } from "../lib/sprite.js";

/** A heart: coral, a peach glint on the left lobe, clover along its lower right edge. */
export function heart() {
  return sprite(
    `
    .cc.cc.
    cpccccl
    ccccccl
    .ccccl.
    ..ccl..
    ...l...
    `,
    { c: C.coral, p: C.peach, l: C.clover },
  );
}

/** The French flag, in three bands: slate for the blue, sunlight for the white, clover for the red. */
export function flagFrance() {
  return sprite(
    `
    bbbwwwrrr
    bbbwwwrrr
    bbbwwwrrr
    bbbwwwrrr
    bbbwwwrrr
    bbbwwwrrr
    `,
    { b: C.slate, w: C.sunlight, r: C.clover },
  );
}

/** A Pyrenean peak with snow on its summit: the lit side to the left, the shade to the right. */
export function mountain() {
  return sprite(
    `
    ....w....
    ...wwm...
    ..wwwmm..
    ..ttwms..
    .tttttss.
    tttttssss
    `,
    { w: C.beeswax, m: C.mist, t: C["deep-teal"], s: C.slate },
  );
}
