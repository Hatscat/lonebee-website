// @ts-check
/**
 * The colors the art may use, read from design/tokens.json: the palette colors, and the UI roles,
 * which alias them. `C.name` throws on an unknown name, so a typo can't draw a wrong color.
 */
import { readFileSync } from "node:fs";

const tokens = JSON.parse(readFileSync(new URL("../design/tokens.json", import.meta.url), "utf8"));
const theme = tokens.color.themes[0].id;

/** @type {Record<string, string>} */
const values = {};
for (const token of tokens.color.tokens) {
  values[token.name] = typeof token.value === "string" ? token.value : token.value[theme];
}
/** Palette colors only: the hex values, not the aliases. */
export const PALETTE = new Set(Object.values(values).filter((v) => v.startsWith("#")));
for (const [name, value] of Object.entries(values)) {
  if (value.startsWith("{")) values[name] = values[value.slice(1, -1)];
}

/** @type {Record<string, string>} */
export const C = new Proxy(values, {
  get(target, name) {
    if (typeof name !== "string" || !(name in target)) throw new Error(`art: unknown color "${String(name)}"`);
    return target[name];
  },
});

/** The palette's ramps, darkest first, as color values. */
export const RAMPS = Object.fromEntries(
  (tokens.meta?.ramps ?? []).map((/** @type {{ name: string, colors: string[] }} */ r) => [r.name, r.colors.map((n) => values[n])]),
);
