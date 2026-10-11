// @ts-check
/**
 * The bee's flight over the hero art: a small figure-eight, the shape of a honeybee's waggle dance,
 * with a light hover bob, traced in whole art pixels. Shared by the art build, which draws the
 * still frame, and hero.js, which animates it: pure functions of time, so both draw the same
 * pixels.
 */

/**
 * @typedef {object} Flight
 * @property {[number, number]} center the middle of the eight, in art pixels
 * @property {[number, number]} radius half its width and half its height
 * @property {number} period seconds per loop
 * @property {number} bob hover bob amplitude, in art pixels
 * @property {number} bobPeriod seconds per bob
 * @property {boolean} [turns] whether the bee turns to face its direction of flight. A hovering
 *   bee keeps facing the light instead, so its lighting stays true; it then always faces right.
 */

/**
 * @typedef {object} Trail
 * @property {string[]} colors dot colors, from the newest dot to the oldest
 * @property {number} dots how many dots
 * @property {number} gap seconds between two dots
 * @property {number} clear art pixels around the bee's center left free of dots
 */

const TAU = 2 * Math.PI;

/**
 * Where the bee is at time t (seconds), in whole art pixels, and which way it faces.
 * @param {Flight} f
 * @param {number} t
 * @returns {{ x: number, y: number, facing: 1 | -1 }}
 */
export function beeAt(f, t) {
  const a = (TAU * t) / f.period;
  const x = f.center[0] + f.radius[0] * Math.sin(a);
  const y = f.center[1] + f.radius[1] * Math.sin(2 * a) + f.bob * Math.sin((TAU * t) / f.bobPeriod);
  // cos(a) is the sign of dx/dt: a turning bee faces where it flies.
  const facing = f.turns && Math.cos(a) < 0 ? -1 : 1;
  return { x: Math.round(x), y: Math.round(y), facing };
}

/**
 * The dotted trail behind the bee at time t: where it was, one dot every `gap` seconds.
 * @param {Flight} f
 * @param {Trail | null} trail
 * @param {number} t
 * @returns {{ x: number, y: number, color: string }[]} oldest first, so newer dots paint on top
 */
export function trailAt(f, trail, t) {
  if (!trail || trail.dots === 0) return [];
  const now = beeAt(f, t);
  // Dots sit on a fixed time grid, so they stay put as the bee flies on instead of crawling.
  const latest = Math.floor(t / trail.gap) * trail.gap;
  const dots = [];
  for (let k = trail.dots - 1; k >= 0; k--) {
    const p = beeAt(f, latest - k * trail.gap);
    const near = Math.abs(p.x - now.x) <= trail.clear && Math.abs(p.y - now.y) <= trail.clear;
    // Fade by age: the colors share the dots evenly, newest first.
    const color = trail.colors[Math.floor((k * trail.colors.length) / trail.dots)];
    if (!near) dots.push({ x: p.x, y: p.y, color });
  }
  return dots;
}
