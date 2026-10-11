// @ts-check
/**
 * A seeded random generator (mulberry32), so procedural details such as stars or grass blades land
 * on the same pixels at every build.
 * @param {number} seed
 */
export function rng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** A float in [0, 1). */
    next,
    /**
     * A whole number from min to max, both included.
     * @param {number} min
     * @param {number} max
     */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /**
     * @template T
     * @param {T[]} items
     * @returns {T}
     */
    pick: (items) => items[Math.floor(next() * items.length)],
    /**
     * True with the given probability.
     * @param {number} p
     */
    chance: (p) => next() < p,
  };
}
