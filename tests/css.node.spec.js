// @ts-check
/**
 * The design system's rule, enforced: every value in site.css comes from a token. Raw colors,
 * lengths, durations, weights and the like belong in design/tokens.json; media queries are the one
 * place a raw length may appear, because custom properties can't be used there.
 */
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const CSS_FILE = new URL("../site/css/site.css", import.meta.url);

/** The CSS named colors, which would sneak past a hex check. */
const NAMED = new Set(
  ("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood " +
    "cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray " +
    "darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue " +
    "firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew " +
    "hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue " +
    "mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred " +
    "midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple " +
    "rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
    "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white " +
    "whitesmoke yellow yellowgreen").split(" "),
);

/**
 * Every declaration of a stylesheet with its line, and whether it sits inside an at-rule prelude
 * (which this checker never sees as a declaration).
 * @param {string} css
 * @returns {{ property: string, value: string, line: number }[]}
 */
function declarations(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  /** @type {{ property: string, value: string, line: number }[]} */
  const out = [];
  let buffer = "";
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== "\\") quote = "";
      buffer += ch;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    if (ch === "{") {
      depth++;
      buffer = "";
      start = i + 1;
    } else if (ch === ";" || ch === "}") {
      const decl = buffer.trim();
      if (depth > 0 && decl.includes(":") && !decl.startsWith("@")) {
        const colon = decl.indexOf(":");
        const line = text.slice(0, start + buffer.indexOf(decl)).split("\n").length;
        out.push({ property: decl.slice(0, colon).trim().toLowerCase(), value: decl.slice(colon + 1).trim(), line });
      }
      if (ch === "}") depth--;
      buffer = "";
      start = i + 1;
    } else buffer += ch;
  }
  return out;
}

/**
 * The problems of one declaration's value, as messages.
 * @param {string} property
 * @param {string} value
 */
function problems(property, value) {
  if (property.startsWith("--")) return ["custom properties are defined in design/tokens.json only"];
  const found = [];
  // Strings (content: "…") and var() names can hold anything.
  const bare = value.replace(/"[^"]*"|'[^']*'/g, '""').replace(/var\(--[A-Za-z0-9_-]+/g, "var(");
  if (/#[0-9a-f]{3,8}\b/i.test(bare)) found.push("raw hex color");
  if (/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i.test(bare)) found.push("color function");
  const named = bare.toLowerCase().match(/[a-z]+/g)?.find((word) => NAMED.has(word));
  if (named) found.push(`named color "${named}"`);
  if (/(^|[^\w.-])-?\d*\.?\d+(px|rem|em|ch|ex|pt|pc|cm|mm|in|q|lh|rlh|cap|ic|[sld]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))\b/i.test(bare)) {
    found.push("raw length");
  }
  if (/(^|[^\w.-])-?\d*\.?\d+m?s\b/i.test(bare)) found.push("raw duration");
  if (/\b(cubic-bezier|steps|linear)\(/i.test(bare)) found.push("raw easing");
  if (/^(z-index|font-weight|line-height|letter-spacing|font-size)$/.test(property) && /(^|\s)-?\d/.test(bare)) {
    found.push(`raw ${property}`);
  }
  if (property === "opacity" && !/^(0|1|var\(\))$/.test(bare)) found.push("opacity blends colors outside the palette");
  if (property === "font-family" && !/^var\(--font-[\w-]+\)$/.test(value.trim())) found.push("font-family must be a --font-* token");
  if (property === "font" && !/^var\(--type-[\w-]+\)$/.test(value.trim())) found.push("font must be a --type-* token");
  return found;
}

test("site.css takes every value from a token", async () => {
  const css = await readFile(CSS_FILE, "utf8");
  const failures = declarations(css).flatMap(({ property, value, line }) =>
    problems(property, value).map((p) => `site.css:${line} ${property}: ${value} → ${p}`),
  );
  expect(failures).toEqual([]);
});

test("the checker catches what it must", () => {
  const css = `
    a { color: #fff; }
    @media (min-width: 720px) { b { margin: 12px; } }
    c { transition: color 120ms; z-index: 3; opacity: 0.5; font-family: Arial; }
    d { background: rgb(0 0 0); border-color: rebeccapurple; }
    e { padding: var(--space-4); width: calc(100% - var(--space-2) * 2); opacity: 0; }
    f { --local: 4px; }
    g { height: 50vw; font: var(--space-4); }
  `;
  const found = declarations(css).flatMap(({ property, value }) => problems(property, value).map((p) => `${property} ${p}`));
  expect(found).toEqual([
    "color raw hex color",
    "margin raw length",
    "transition raw duration",
    "z-index raw z-index",
    "opacity opacity blends colors outside the palette",
    "font-family font-family must be a --font-* token",
    "background color function",
    "border-color named color \"rebeccapurple\"",
    "--local custom properties are defined in design/tokens.json only",
    "height raw length",
    "font font must be a --type-* token",
  ]);
});
