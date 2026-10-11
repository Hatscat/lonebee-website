# Lone Bee website

`lonebee.games` is the personal site of Lone Bee, a one-person game studio: a landing page and games
hub for players and followers, and later a portfolio. It is a static site on GitHub Pages under the
custom domain `lonebee.games`. Each game lives on its own subdomain (`limpidchess.lonebee.games`,
`drawmycode.lonebee.games`) and in its own repository. English only, US spelling. No backend, no
cookies; Umami counts page views, without cookies, on the production host only.

- Implementation plan, decisions and launch steps: `docs/PLAN.md`. Tick its boxes as steps land.
- Design system: `design/README.md` is the brand book, `design/tokens.json` holds every token,
  `design/components/` documents each component with a live preview. They are published as the
  "Lone Bee" Design System artifact on claude.ai (its link is at the top of `docs/PLAN.md`). Change
  the repository first, then republish the artifact from it with `scripts/design-system.js`.

## Commands

| Command            | Purpose                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `npm run serve`    | Serve `site/` the way GitHub Pages does, at http://localhost:4300             |
| `npm run generate` | Regenerate everything derived: `tokens.css`, the palette files, all the art   |
| `npm run lint`     | Generated files up to date, HTML valid                                        |
| `npm test`         | Playwright on Chromium, Firefox, WebKit, Pixel 7 and iPhone 14, plus the Node checks (CSS from tokens only, every file used, the art's rules, the engine) |
| `npm run check`    | `lint`, then `test`. Run before every commit; CI runs it before deploying     |
| `npm run shots`    | Screenshots at four sizes into `test-results/shots/`, for a visual review     |

One spec: `npx playwright test tests/meta.spec.js`. One browser: add `--project=chromium`. The Node
checks alone: `--project=node`. When another run may be going on in the repository, pass
`--output=<a folder of your own>`: each run wipes its output folder.

Publishing the design system: `node scripts/design-system.js <folder>` assembles the artifact's
files; it prints the images to upload, and `--records <file>` then writes the artifact's index.

## Layout

```
site/            Deployed as is to GitHub Pages. No build step.
  index.html, 404.html
  css/tokens.css   Generated from design/tokens.json.
  css/site.css     Every style of the site, written with tokens only.
  js/hero.js       Sizes the hero art to whole device pixels and animates it. The page works without it.
  js/flight.js     The bee's flight path, shared with art/build.js so both draw the same frames.
  js/hero-data.js  Generated: the hero's size, layers and motion.
  js/analytics.js  Adds Umami's tracker on lonebee.games only (the website Draw my code shares).
  fonts/           Jersey 10, Atkinson Hyperlegible Next and Mono, each with its OFL license.
  img/             Generated art, plus img/games/ (card images, from each game's own art).
design/          tokens.json (source of truth), README.md (brand book), components/ (docs and
                 previews), palette/ (for Pixelorama, Aseprite, Lospec), assets/ (the brand kit).
art/             The pixel art, drawn in code (Node, zero dependencies). pieces/ holds the art
                 (mark, wordmark, hero, bits); lib/ the PNG, ICO and SVG writers and raster tools;
                 build.js composes and writes every image.
scripts/         serve.js (local server), tokens.js (tokens.json → tokens.css and palettes),
                 design-system.js (assembles the Design System artifact).
tests/           Playwright specs, and Node-only checks (*.node.spec.js).
docs/PLAN.md     The plan.
```

## Hard rules

### Site

- `site/` is what GitHub Pages serves: plain HTML5, CSS3 and vanilla JS modules. No framework,
  bundler or build step for the site itself; only the tokens and the art are generated, and their
  output is committed.
- Zero runtime dependencies and no third-party request but one: fonts, images and scripts are
  self-hosted. The exception is Umami (`js/analytics.js`): on lonebee.games only, page views only,
  no custom event (Umami holds a tracked link until its request ends), no cookie, nothing that
  identifies anyone. It shares Draw my code's Umami website: the Hobby plan allows one, and each
  site is told apart by its hostname.
- Every page starts its head with the same Content-Security-Policy meta tag (`'self'`, plus
  Umami's two hosts; a test checks it), so no inline `<script>` (JSON-LD data blocks excepted), no
  `<style>` and no `style=""`.
- Root-relative URLs (`/css/site.css`), never relative ones: GitHub Pages serves `404.html` at any
  missing path, so a relative URL would break there.
- Progressive enhancement: every word and link works without JavaScript.
- Every page has `lang="en"`, a title, a meta description, the shared header and the shared footer.
  Indexable pages also have a canonical URL, and Open Graph and Twitter tags with absolute
  `https://lonebee.games/` URLs. `404.html` has `noindex` instead: it answers at every missing path.
- Accessibility is WCAG 2.2 AA: axe reports nothing, every control works with the keyboard, focus
  is always visible (high-contrast modes included), every tap target is `tap-min` tall, text
  contrast follows the notes in `design/tokens.json`.
- Motion that starts by itself stops within five seconds: the hero plays one loop, then rests.
  `prefers-reduced-motion` stops it from the start. No CSS transitions or animations.
- Images carry `width`, `height` and `alt` (empty when decorative). Below the fold:
  `loading="lazy"`.
- External links are plain `<a href="https://…">`, opening in the same tab.

### Design system

- Every color, font, type size, spacing, radius, border, shadow and layer is a token in
  `design/tokens.json`. Colors, spacing, borders, radii, shadows, layout values and layers keep
  their names as CSS custom properties (`bg` is `var(--bg)`); a type style is a font shorthand,
  `--type-<style>` (`font: var(--type-body)`); a font family is `--font-<family>`.
- `site.css` uses tokens only: a test fails on a raw color anywhere in it, and on a raw length
  (viewport units included) outside media queries, where custom properties can't be used.
- To add or change a value: edit `design/tokens.json`, run `npm run generate`, then use the token.
- The UI and the art share one palette. A color that is not in the palette doesn't exist: the
  generator fails on a shadow color outside it, and the art build on a pixel outside it.

### Pixel art

- Generated, never edited by hand: `site/img/` (except `img/games/`), `site/favicon.ico`,
  `site/apple-touch-icon.png`, `site/js/hero-data.js` and `design/assets/` (by `art/build.js`);
  `site/css/tokens.css` and `design/palette/` (by `scripts/tokens.js`). Change the source, then
  `npm run generate`. The lint step fails when an output is stale.
- Palette colors only. No anti-aliasing, blur or smooth gradients; shade with ramps, hatched strata
  and ordered dithering.
- Scale by whole numbers only (nearest neighbor). On the page, use `image-rendering: pixelated`.
- The hero art keeps its contract with the page (`tests/hero-art.node.spec.js`): only dark colors
  under the hero copy (columns 0 to 150, rows 0 to 105), its last 6 rows in `hive`, one flight loop
  of five seconds at most, no pixel flashing more than three times a second.

### Copy

- English, US spelling. Short, plain sentences in the first person ("I make…"); no hype words.
  Sentence case for headings, buttons and links.
- Game names exactly: "Limpid Chess", "Draw my code", "Draw my code Kids", "Truth Table Game".
  Lead Limpid Chess with "smooth", as its own site does.
- Every claim must stay true for every game, including future ones: no blanket "no ads", "free" or
  "first on itch.io". "No cookies" in the footer stays only as long as no cookie is set.
- No emoji. A symbol that says it better than a word is a pixel glyph from `art/pieces/glyphs.js`
  (`<img class="glyph">`, 2x), with alt text that reads as the word ("love", "France"). The tagline
  is "I craft games with ♥"; the footer ends with "Crafted with ♥ in the Pyrenees", the owner's
  mountains.

### Tooling

- Node 24 LTS (or 22.22 and later), for tooling only; `.nvmrc` names it, so `nvm use` picks it.
  Dev dependencies are pinned to exact versions:
  `@playwright/test`, `@axe-core/playwright`, `html-validate`. Anything else: ask me first, with
  the reason and the cost.
- Plain JavaScript ES modules with `// @ts-check` and JSDoc types. No TypeScript build.
- Comments explain why, not what.

## Adding a game

1. Its image. Released: the game's 1200×630 link preview (or another 40:21 image), as WebP in
   `site/img/games/<slug>.webp`. In the works: a 160×84 pixel art tile drawn in
   `art/pieces/bits.js` and listed in `art/build.js` (`site/img/next/<slug>.png`), then
   `npm run generate`.
2. Its card in `site/index.html`, copied from an existing one. Released: the name (a link to the
   game's site), a one-line pitch, the platforms, then the actions: play first, then the stores.
   In the works: the name, the pitch, the platforms; no links, no status, no dates.
3. The game in `GAMES` (or `NEXT`) in `tests/content.spec.js`, then `npm run check`.

A new game site on a subdomain: set the custom domain in that repository's Pages settings, then add
a DNS-only `CNAME <slug> → hatscat.github.io` in Cloudflare. A game whose source must stay private
can't use GitHub Pages on the free plan: see "Private game repositories" in `docs/PLAN.md`.

## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`: `npm run check`, then deploy `site/` to
GitHub Pages. The custom domain lives in the repository's Pages settings (an Actions deploy ignores
a `CNAME` file). DNS is on Cloudflare, every record DNS only (grey cloud): see "Launch" in
`docs/PLAN.md`.
