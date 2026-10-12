// @ts-check
/**
 * Assembles the "Lone Bee" Design System artifact from this repository, into <out>/project/:
 * the brand book, the tokens, the fonts, the site's stylesheet as the components' bundle.css,
 * the component guidelines and previews, the images the previews show, the asset groups' notes
 * and the cover. The repository is the source: change it, then run this and publish the folder.
 *
 *   node scripts/design-system.js <out> [--records <records.json>]
 *
 * Images under assets/ are uploads, not files: upload each one listed by this script to the
 * artifact, then pass their records ({ "<Group>": { "<file>": { "blob", "size", "type" } } }) with
 * --records to write the index, project/design-system.json.
 */
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { combCell } from "../art/pieces/bits.js";
import { C } from "../art/palette.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const at = (/** @type {string} */ path) => join(ROOT, path);

/** The images the previews show, copied as files into project/media/. */
const MEDIA = [
  "site/img/logo.svg",
  "site/img/logo-small.svg",
  "site/img/mark.svg",
  "site/img/hero.png",
  "site/img/ui/comb-full.svg",
  "site/img/ui/comb-half.svg",
  "site/img/ui/twinkle.svg",
  "site/img/ui/heart.svg",
  "site/img/ui/flag-fr.svg",
  "site/img/ui/mountain.svg",
  "site/img/games/limpid-chess.webp",
  "site/img/next/truth-table-game.png",
];

/** The uploads of each asset group, in tile order, with each group's note. */
export const GROUPS = {
  Logos: {
    tile: "m",
    files: [
      "design/assets/lockup-4x.png",
      "design/assets/lockup-small-2x.png",
      "design/assets/lockup-on-beeswax-4x.png",
      "design/assets/wordmark-4x.png",
      "design/assets/mark-512.png",
      "design/assets/mark-16.png",
      "site/img/logo.svg",
      "site/img/logo-small.svg",
      "site/img/mark.svg",
    ],
    note: `The logo: a worker honeybee seen from the side (the mark), beside "LONE BEE" in a bitmap
typeface drawn for it, whose O is a honey cell (the wordmark). Together they are the lockup, at the
same pixel scale, the bee facing the word. Drawn in code (art/pieces/mark.js and wordmark.js in the
website repository); use the files as they are.

- \`lockup-4x.png\`, \`logo.svg\` (2x): the lockup on dark grounds: \`hive\`, \`propolis\`, \`comb-black\`, \`dusk\`.
- \`lockup-small-2x.png\`, \`logo-small.svg\` (1x): with a plain O, for small sizes, where the cell reads as a cup.
- \`lockup-on-beeswax-4x.png\`: the only light version: \`comb-black\` letters on \`beeswax\`.
- \`wordmark-4x.png\`: the wordmark alone.
- \`mark-512.png\` (16x), \`mark.svg\` (2x): the mark alone, transparent. \`mark-16.png\`: the favicon cut, drawn at 16px.

Clear space: one cell (8 art pixels) around the lockup. Smallest sizes: the lockup at 1x (32px
tall), the mark at 16px (its own cut). Scale by whole numbers only. Never on \`gold\`, never
recolored beyond the two inks, never with a glow, an outline, a tilt, or the bee facing away from
the word.`,
  },
  Icons: {
    tile: "s",
    files: [
      "site/img/icons/icon-192.png",
      "site/img/icons/icon-512.png",
      "site/img/icons/maskable-512.png",
      "site/apple-touch-icon.png",
      "design/assets/mark-on-hive-512.png",
      "design/assets/avatar-400.png",
      "design/assets/ui/comb-empty.svg",
      "design/assets/ui/comb-half.svg",
      "design/assets/ui/comb-full.svg",
      "design/assets/ui/twinkle.svg",
      "site/img/ui/heart.svg",
      "site/img/ui/flag-fr.svg",
      "site/img/ui/mountain.svg",
    ],
    note: `App and avatar icons, and the interface's pixel icons. Generated; use them as they are.

- \`icon-192.png\`, \`icon-512.png\`: the mark, transparent, at 6x and 16x (web app manifest, structured data).
- \`maskable-512.png\`, \`mark-on-hive-512.png\`: the mark on a \`hive\` tile, inside the maskable safe zone (Android, stores: opaque).
- \`apple-touch-icon.png\`: 180×180, opaque (iOS rounds its corners).
- \`avatar-400.png\`: for profiles: X, itch.io, Discord.
- \`comb-empty.svg\`, \`comb-half.svg\`, \`comb-full.svg\`: comb cells; full for what is out, half for what is in the works.
- \`twinkle.svg\`: a star of \`glint\`, \`mist\` and \`deep-teal\`, for following along.
- \`heart.svg\`, \`flag-fr.svg\`, \`mountain.svg\`: glyphs that stand in a line of text where an
  emoji would go, at 2x: "I craft games with ♥", "Crafted with ♥ in the Pyrenees". Their alt text
  reads as the word ("love", "France"); the peak is decorative.`,
  },
  Art: {
    tile: "l",
    files: ["design/assets/hero-1500x750.png", "site/img/lost.png", "site/img/next/draw-my-code-junior.png", "site/img/next/truth-table-game.png"],
    note: `The pixel art. The hero: a lone honeybee hovering over a valley of the Ariège Pyrenees at
golden hour, under the Montcalm and the Pic d'Estats, its wings lit through by the low sun, 300×150
pixels (here at 5x). The 404 page: the same valley at the blue hour, and a carline thistle whose
bee has flown away. Teaser tiles of the games in the works, 160×84 (40:21, like the game cards).
Drawn in code; every pixel is a palette color; scale by whole numbers only.`,
  },
  Social: {
    tile: "l",
    files: ["site/img/og.png", "design/assets/x-header-1500x500.png", "design/assets/itch-banner-960x240.png", "design/assets/discord-banner-960x540.png"],
    note: `Images for link previews and profile pages, cut from the hero art at whole-number scales.

- \`og.png\`: the link preview (Open Graph, X), 1200×630: the scene with the wordmark and "INDIE GAMES, CRAFTED WITH ♥".
- \`x-header-1500x500.png\`: X profile header (X may crop 60px at the top and bottom).
- \`itch-banner-960x240.png\`: itch.io profile banner, in Fixed width.
- \`discord-banner-960x540.png\`: Discord server banner: no text or logo, as Discord asks.`,
  },
  Palette: {
    tile: "m",
    files: ["design/palette/lonebee-32x.png", "design/palette/lonebee-1x.png"],
    note: `The 32 colors, one row per ramp, darkest first: Propolis, Honey, Beeswax, Dusk, Meadow,
Heather, Clover. \`lonebee-1x.png\` has one pixel per color. In this folder too: \`lonebee.gpl\`
(Pixelorama, Aseprite, GIMP, Krita) and \`lonebee.hex\` (Lospec).`,
  },
};

/** Media types of the uploads. */
const TYPES = { ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };

/**
 * The cover: identity blocks and a honeycomb drift built from the real comb-cell art, every fill a
 * token, the name in Jersey 10 at 112px. See the Design System type's cover brief.
 */
function cover() {
  const UNIT = 4; // one art pixel of the cells: two UI pixels
  /** @type {Map<string, string>} color value → palette token name */
  const names = new Map(Object.entries(C).filter(([, v]) => v.startsWith("#")).reverse().map(([k, v]) => [v, k]));
  /** @type {string[]} */
  const used = [];
  /**
   * @param {"empty" | "half" | "full"} fill
   * @param {number} ox
   * @param {number} oy
   */
  const cell = (fill, ox, oy) => {
    const art = combCell(fill);
    const rects = [];
    for (let y = 0; y < art.height; y++) {
      for (let x = 0; x < art.width; x++) {
        const color = art.get(x, y);
        if (!color) continue;
        const name = /** @type {string} */ (names.get(color));
        if (!used.includes(name)) used.push(name);
        rects.push(`<rect class="c-${name}" x="${ox + x * UNIT}" y="${oy + y * UNIT}" width="${UNIT}" height="${UNIT}"/>`);
      }
    }
    return rects.join("");
  };
  // A honeycomb: pointy-top cells on an offset grid, drifting up and right like a comb being built.
  const W = combCell("full").width * UNIT;
  const H = combCell("full").height * UNIT;
  const plan = [
    [0, 3, "empty"], [1, 3, "half"], [2, 3, "full"],
    [0, 2, "half"], [1, 2, "full"], [2, 2, "full"], [3, 2, "full"],
    [1, 1, "full"], [2, 1, "full"], [3, 1, "half"],
    [2, 0, "full"], [3, 0, "full"], [4, 0, "empty"],
  ];
  const cells = plan
    .map(([col, row, fill]) => {
      const x = 520 + Number(col) * (W + UNIT) + (Number(row) % 2) * ((W + UNIT) / 2);
      const y = 40 + Number(row) * (H - UNIT * 2);
      return cell(/** @type {"empty" | "half" | "full"} */ (fill), x, y);
    })
    .join("\n    ");
  const styles = used.map((n) => `.c-${n} { fill: var(--${n}); }`).join("\n    ");
  return `<!-- @dsCard height=288 -->
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Lone Bee</title></head>
<body>
<div class="cover">
  <svg viewBox="0 0 960 288" width="960" height="288" aria-hidden="true">
    <!--
      blocks: gold slab 256x168 (the accent), dusk slab 256x120 (the cool note), beeswax strip 32x288 (the words)
      arrangement: a strip of unequal bands bleeding off the top, right and bottom edges, like the hero's sky in strata
      pattern: the comb cell (a literal motif), built pixel by pixel from the site's own cell art, drifting toward the light
      scales: cells of 10x11 art pixels at 4px (two UI pixels), one art pixel apart; blocks on the 4px grid; no radius
    -->
    <rect class="b-beeswax" x="472" y="0" width="16" height="288"/>
    <rect class="b-gold" x="704" y="0" width="256" height="168"/>
    <rect class="b-dusk" x="704" y="184" width="256" height="104"/>
    ${cells}
  </svg>
  <div class="words">
    <div class="name">Lone Bee</div>
    <p class="tagline">Hive and amber: one palette for the pixel art and the interface.</p>
  </div>
  <style>
    .cover { position: relative; width: 960px; height: 288px; background: var(--bg); overflow: hidden; }
    .cover svg { position: absolute; inset: 0; shape-rendering: crispEdges; }
    .b-beeswax { fill: var(--beeswax); }
    .b-gold { fill: var(--gold); }
    .b-dusk { fill: var(--dusk); }
    ${styles}
    .words { position: absolute; left: 40px; bottom: 36px; max-width: 420px; }
    .name { font-family: var(--font-display); font-size: 112px; line-height: 0.95; color: var(--text); text-shadow: var(--shadow-title); }
    .tagline { margin: 14px 0 0; font-family: var(--font-body); font-size: 14px; line-height: 20px; color: var(--text-muted); }
  </style>
</div>
</body>
</html>
`;
}

/**
 * @param {string} from repository path
 * @param {string} to absolute path
 */
async function copy(from, to) {
  await mkdir(dirname(to), { recursive: true });
  await copyFile(at(from), to);
}

/**
 * @param {string} to absolute path
 * @param {string} text
 */
async function write(to, text) {
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, text);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: node scripts/design-system.js <out> [--records <records.json>]");
  const project = join(out, "project");
  const tokens = JSON.parse(await readFile(at("design/tokens.json"), "utf8"));

  // The brand book, and what the page can't hold.
  const readme = await readFile(at("design/README.md"), "utf8");
  await write(
    join(project, "README.md"),
    `${readme.trimEnd()}

## Not synced

- The type styles also exist as font shorthands, \`--type-<style>\`, at the top of
  \`components/bundle.css\`: the website writes \`font: var(--type-body)\`. They are copies of the
  type styles here; an edit to a type style on this page doesn't reach them.
- Motion has no tokens: the interface doesn't tween, and the hero art's frame rate and timings live
  with the art.
- Components are static renditions of the website's markup, styled by its own stylesheet: the
  site has no component library.
`,
  );

  // Tokens, with where they came from.
  tokens.meta = { ...tokens.meta, source: "repository", repo: "lonebee_website", paths: { tokens: ["design/tokens.json"], css: ["site/css/site.css"], fonts: ["site/fonts/"], docs: ["design/README.md", "design/components/"] } };
  await write(join(project, "tokens.json"), `${JSON.stringify(tokens, null, 2)}\n`);

  // Fonts, as tokens.json lists them.
  for (const font of tokens.type.fonts) await copy(`site/${font.file}`, join(project, font.file));

  // The components' stylesheet: the site's, after the type shorthands it uses.
  const shorthands = tokens.type.groups.flatMap((/** @type {any} */ g) =>
    g.styles.map((/** @type {any} */ s) => `  --type-${s.name}: ${s.fontWeight ?? 400} ${s.fontSize}/${s.lineHeight ?? "normal"} var(--font-${s.family ?? g.family});`),
  );
  const css = await readFile(at("site/css/site.css"), "utf8");
  await write(join(project, "components/bundle.css"), `/* The type styles as font shorthands, as the website's tokens.css declares them. */\n:root {\n${shorthands.join("\n")}\n}\n\n${css}`);

  // Component guidelines and previews.
  for (const name of await readdir(at("design/components"))) {
    for (const file of ["README.md", "preview.html"]) await copy(`design/components/${name}/${file}`, join(project, "components", name, file));
  }
  await write(join(project, "components/Cover/preview.html"), cover());

  // The images the previews show.
  for (const path of MEDIA) await copy(path, join(project, "media", basename(path)));

  // Asset groups: their notes and text files here; their images are uploads.
  for (const [group, { note }] of Object.entries(GROUPS)) await write(join(project, "assets", group, "README.md"), `${note}\n`);
  await copy("design/palette/lonebee.gpl", join(project, "assets/Palette/lonebee.gpl"));
  await copy("design/palette/lonebee.hex", join(project, "assets/Palette/lonebee.hex"));

  // The index, once the uploads exist.
  const recordsAt = process.argv.indexOf("--records");
  if (recordsAt > 0) {
    const records = JSON.parse(await readFile(process.argv[recordsAt + 1], "utf8"));
    const assetGroups = Object.fromEntries(
      Object.entries(GROUPS).map(([group, { tile, files }]) => {
        const names = files.map((f) => basename(f));
        return [group, { name: group, tile, order: names, files: Object.fromEntries(names.map((n) => [n, { name: n, ...records[group][n] }])) }];
      }),
    );
    const index = {
      v: 3,
      layout: "files",
      createdOnFiles: records.createdOnFiles,
      title: "Lone Bee",
      namespace: "LoneBee",
      libraries: [],
      sections: {},
      groups: Object.keys(GROUPS),
      assetGroups,
      blobs: {},
      docs: { readme: "project/README.md", sections: [] },
      lastChange: records.lastChange,
    };
    await write(join(project, "design-system.json"), `${JSON.stringify(index, null, 2)}\n`);
  }

  // What to upload.
  for (const [group, { files }] of Object.entries(GROUPS)) {
    for (const f of files) {
      const info = await stat(at(f));
      const ext = f.slice(f.lastIndexOf("."));
      console.log(`${group}\t${basename(f)}\t${f}\t${info.size}\t${TYPES[/** @type {keyof typeof TYPES} */ (ext)]}`);
    }
  }
}
