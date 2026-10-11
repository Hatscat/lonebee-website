# lonebee.games

The website of Lone Bee, a one-person game studio: a landing page and games hub, hosted on GitHub
Pages at https://lonebee.games/. Plain HTML, CSS and one small script, no framework, no build step,
only cookieless page counts (Umami).

- Conventions for Claude Code and for humans: [CLAUDE.md](CLAUDE.md).
- The plan, and the launch steps (DNS, GitHub Pages): [docs/PLAN.md](docs/PLAN.md).
- The brand book and design system: [design/README.md](design/README.md), with every token in
  [design/tokens.json](design/tokens.json).

## Setup

Node.js 24 LTS (or 22.22 and later). With nvm, `nvm use` picks it from `.nvmrc`. Then:

```sh
npm ci
npx playwright install chromium firefox webkit   # once; add --with-deps on a fresh machine
```

## Everyday commands

| Command            | What it does                                                          |
| ------------------ | --------------------------------------------------------------------- |
| `npm run serve`    | Serve `site/` like GitHub Pages does, at http://localhost:4300        |
| `npm run generate` | Rebuild what is generated: `site/css/tokens.css`, the palette, the art |
| `npm run lint`     | Generated files up to date, HTML valid                                |
| `npm test`         | Playwright on five browsers, plus checks on files, CSS tokens and art |
| `npm run check`    | `lint`, then `test`. Run before every commit                          |
| `npm run shots`    | Screenshots at phone, tablet, laptop and wide sizes, for a review     |

## Where things are

```
site/      The website, deployed as is. Edit index.html for the content.
design/    tokens.json (every color, font and size), the brand book, components/ (docs and previews),
           the palette, the brand kit (assets/).
art/       The pixel art, drawn in code. Change a piece in art/pieces/, then npm run generate.
scripts/   The local server, the tokens generator, and design-system.js (the Design System artifact).
tests/     Playwright specs, and checks on files, CSS and art.
```

## Add a game

See "Adding a game" in [CLAUDE.md](CLAUDE.md): a card image in `site/img/games/`, a card in
`site/index.html`, a line in `tests/content.spec.js`, then `npm run check`.

## Deploy

Every push to `main` runs `npm run check` on GitHub Actions, then deploys `site/` to GitHub Pages.
The first launch needs a few steps in GitHub and Cloudflare: see "Launch" in
[docs/PLAN.md](docs/PLAN.md).

## Credits

Fonts, under the SIL Open Font License: Jersey 10 by Sarah Cadigan-Fried, Atkinson Hyperlegible
Next and Mono by the Braille Institute. The game art on the cards comes from each game.
