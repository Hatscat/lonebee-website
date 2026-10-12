# lonebee.games: implementation plan

The site in one sentence: a fast, accessible, static landing page for Lone Bee that shows the games
(play now, coming next), points followers to itch.io, and carries a pixel art identity that the
design system turns into rules reusable anywhere (itch.io, stores, social).

The Design System artifact (private until you share it from its page):
https://claude.ai/artifact/HMWajZXGVCR7cy6miXn9tC. Rebuild its files with `scripts/design-system.js`.

Each step lists what it delivers and how it is checked. Steps run in order: the design system comes
before the art (the art is painted with its palette), and the art before the site.

## 0. Discovery and decisions

Facts found:

- [x] GitHub account `Hatscat`. Both games deploy to GitHub Pages: Limpid Chess from `docs/` with a
      `CNAME` file, Draw my code from a GitHub Actions workflow that runs the tests before deploying.
- [x] DNS for `lonebee.games` is on Cloudflare. `limpidchess` and `drawmycode` are DNS-only
      `CNAME`s to `hatscat.github.io`. The apex `lonebee.games` has no record yet.
- [x] Live: https://limpidchess.lonebee.games/ (and `/play/`), the Google Play listing
      `game.limpidchess`, https://drawmycode.lonebee.games/. itch.io: https://lone-bee.itch.io/.
- [x] Public contact already used on the Limpid Chess site: `lone.bee.dev@gmail.com`.
- [x] Playwright 1.63.0 browsers are already installed on this machine (Chromium, Firefox, WebKit).
- [x] Existing Lone Bee images in `~/Pictures` are a realistic bee illustration downscaled with
      nearest neighbor, not pixel art. Kept as an art direction reference only: a realistic
      honeybee, alone in a wide landscape.

Decisions (defaults; each is cheap to change):

- [x] Stack: HTML5, CSS3, vanilla JS modules, no build step for the site. Node only for tooling.
- [x] Hosting: GitHub Pages, deployed by a GitHub Actions workflow gated on the full test suite.
      Suggested repository: `Hatscat/lonebee-website`, public.
- [x] Identity: the brand "Lone Bee" only, no personal name, like the game sites.
- [x] Games: Limpid Chess and Draw my code under "Games". Draw my code Junior and Truth Table Game
      under "In the works", plus one line for the Roblox game and the CrazyGames .io game. No
      launch dates.
- [x] Analytics: Umami Cloud, the website Draw my code already uses (the Hobby plan allows one;
      each site is told apart by its hostname). Page views only, loaded on lonebee.games only by
      `site/js/analytics.js`. Cookieless, so no cookie banner.
- [x] Hero crop: the art is pinned to the bottom right of its box, so crops come off its top and
      left, never the meadow or the light (the owner's call). From 1100px the hero grows up to the
      first screen, and never gets so short that a very wide screen crops the bee. A click on the
      art plays the flight again; Replay, a button shown on keyboard focus only, does the same.
- [x] Dark only: the site is a night scene. The design system may add a light variant for print and
      documents.
- [x] Brand direction: "Hive and amber", chosen from three explored in parallel (it won the art
      direction and pixel craft judges; the accessibility judge's fixes are applied). Fonts: Jersey 10
      (display, crisp at 56px and 112px only), Atkinson Hyperlegible Next (body), Atkinson
      Hyperlegible Mono (code).

## 1. Repository and tooling

- [x] `package.json` (private, `"type": "module"`), exact dev dependencies: `@playwright/test`
      1.63.0 (matches the installed browsers), `@axe-core/playwright`, `html-validate`.
- [x] `scripts/serve.js`: a zero-dependency static server that behaves like GitHub Pages:
      `/dir/` serves `index.html`, `/dir` redirects to `/dir/`, `/page` serves `page.html`, unknown
      paths answer 404 with `404.html`, correct MIME types, no caching.
- [x] `playwright.config.js`: the server as `webServer`; projects `chromium`, `firefox`, `webkit`,
      `pixel-7`, `iphone-14`.
- [x] `.gitignore`, `.editorconfig`, `.html-validate.json`.

Check: `npm test` runs an empty smoke spec on all five projects.

## 2. Brand and design system

- [x] Explore three brand directions in parallel, each with a palette, a type pairing and a sample
      page rendered to a screenshot; judge them; keep the best and graft the best ideas of the
      others.
- [x] Palette: one limited pixel art palette (about 24 to 32 colors, in hue-shifted ramps) that
      paints the art and supplies every UI color.
- [x] Type: a pixel display face for headings and the wordmark, a highly legible body face, a mono
      face for code. Open licenses, self-hosted WOFF2 files, Latin subset.
- [x] Foundations: spacing on a 4px grid, square "pixel" corners, hard pixel shadows (no blur),
      stepped motion, borders, focus ring, layers.
- [x] `design/tokens.json` in the Design System artifact's format (lists of
      `{name, value, usage}`), with the contrast ratio of every text pair in its usage note.
- [x] `scripts/tokens.js`: writes `site/css/tokens.css` and `design/palette/` (`lonebee.gpl`, `lonebee.hex`,
      `lonebee-1x.png`, `lonebee-32x.png`);
      `--check` fails when an output is stale.
- [x] `design/README.md`, the brand book: voice, color roles, type, layout, components, logo usage
      (clear space, minimum sizes, backgrounds, misuse), pixel art rules, and a platform guide:
      which colors, fonts and images to use on itch.io, stores and social sites, with their sizes.

Check: every text pair reaches 4.5:1 (3:1 for large text and UI parts), computed by script.

## 3. Pixel art engine

- [x] `art/lib/`: PNG encoder and decoder (`node:zlib`), ICO writer (PNG frames), SVG writer
      (merged pixel runs, `crispEdges`), a raster with palette colors, sprites from text grids,
      shapes, ordered dithering, a seeded random generator, a bitmap font.
- [x] Unit checks: a PNG round trip, ICO structure, deterministic output.

## 4. Pixel art

- [x] Logo mark: a realistic honeybee, not cartoon, readable at 16px. Explore several, judge, refine.
- [x] Wordmark "LONE BEE" in a bitmap font drawn for it, and the mark + wordmark lockup (SVG).
- [x] Icons: `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180, opaque), 192 and 512, and a
      maskable 512 with the mark inside the safe zone.
- [x] Hero artwork: a lone bee in a wide night landscape. A static PNG for no-JS and reduced
      motion, plus a background layer and a bee sprite sheet for the animation.
- [x] Link preview `og.png`, 1200×630, at a whole-number scale.
- [x] Small art for the 404 page and the "In the works" cards.

Check: every image is generated by `npm run generate`, uses palette colors only, and is reviewed at
1x and zoomed.

## 5. Website

- [x] `index.html`: skip link; header (logo, nav: Games, Follow); hero (art, "Lone Bee", one line,
      buttons "See the games" and "Follow on itch.io"); Games; In the works; Follow (itch.io,
      GitHub, email); footer.
- [x] Game cards: image, name, one-line pitch, platforms, actions. Limpid Chess: play in the
      browser, Google Play, website. Draw my code: play today's puzzle.
- [x] `404.html`: art, one line, a link home; root-relative URLs.
- [x] `css/site.css`: base, layout, components (button, card, badge, link, header, footer, pixel
      frame), tokens only, responsive from 320px, `prefers-reduced-motion`.
- [x] `js/hero.js`: scales the hero art by whole device pixels to cover its box, then animates it
      at 12 frames per second (the wings, one figure-eight loop, the stars) and rests on the still
      frame after one loop, within five seconds; it pauses off screen and stays still for reduced
      motion. Without it, the static image shows. The dotted path is painted into the art.
- [x] Head: title, description, canonical, Open Graph, Twitter, JSON-LD `Organization` and
      `WebSite`, theme color, icons, manifest, preloaded heading font, CSP.
- [x] `robots.txt`, `sitemap.xml`, `site.webmanifest`, `favicon.ico`.
- [x] Card images for Limpid Chess and Draw my code, from their own marketing art, as WebP.

## 6. Tests (Playwright)

- [x] Smoke: no console error or warning, no failed request, no CSP violation, on every page.
- [x] Content: sections, headings in order, every game card complete, links in https.
- [x] Meta: title, description, canonical, Open Graph and Twitter values, JSON-LD parses, manifest
      icons exist at their declared sizes, `robots.txt` and `sitemap.xml`, `favicon.ico` frames.
- [x] Accessibility: axe (WCAG 2.2 AA and best practices) on every page; keyboard order starting
      with the skip link; visible focus; landmarks.
- [x] Layout: no horizontal scroll from 320px to 1920px; hero art at whole device pixels.
- [x] Motion: the hero animates, stops under reduced motion, and the page is complete without JS.
- [x] 404: status 404, its art and styles load from a nested path.
- [x] Node-only: CSS uses tokens only, every file in `site/` is used, generated files are fresh,
      HTML is valid (`html-validate`).

## 7. Review

- [x] Parallel reviews with adversarial verification: accessibility, visual design (screenshots at
      several widths), copy, SEO and link previews, performance and weight, code and tests.
- [x] Fix every confirmed finding, then `npm run check` on all five projects.

Budget: under 250 KB transferred for the home page, no layout shift, no render-blocking request
outside the site's own CSS.

## 8. Design System artifact

- [x] Create "Lone Bee" from the Design System type: README, tokens, fonts, components with live
      previews (button, game card, badge, link, header, footer, pixel frame), assets (logos, icons,
      art, palette), cover. Built from the repository's real files.

## 9. CI and deploy

- [x] `.github/workflows/pages.yml`: on pull requests and pushes to `main`, run `npm run check`
      with fresh Playwright browsers; on `main`, upload `site/` and deploy it to Pages. Minimal
      permissions, one deploy at a time.

## 10. Launch (your actions)

Already done: `lonebee.games` is verified for the `Hatscat` account (the TXT record
`_github-pages-challenge-Hatscat` is in Cloudflare). Verification stops anyone else from claiming
the domain or its subdomains on GitHub Pages. Check that Settings → Pages lists it as verified.

1. Create the repository `Hatscat/lonebee-website` (public) and push `main`. The first run checks
   everything, then fails at deploy: Pages isn't enabled yet. That's expected.
2. Repository Settings → Pages → Source: GitHub Actions. Then re-run the failed job (Actions →
   Pages → Re-run failed jobs). Until step 3, the site answers at
   `https://hatscat.github.io/lonebee-website/` without its styles and images, because every URL is
   root-relative: that is expected too.
3. Repository Settings → Pages → Custom domain: `lonebee.games`.
4. Cloudflare DNS for `lonebee.games`, every record DNS only (grey cloud):

   | Type  | Name  | Content               |
   | ----- | ----- | --------------------- |
   | A     | `@`   | `185.199.108.153`     |
   | A     | `@`   | `185.199.109.153`     |
   | A     | `@`   | `185.199.110.153`     |
   | A     | `@`   | `185.199.111.153`     |
   | AAAA  | `@`   | `2606:50c0:8000::153` |
   | AAAA  | `@`   | `2606:50c0:8001::153` |
   | AAAA  | `@`   | `2606:50c0:8002::153` |
   | AAAA  | `@`   | `2606:50c0:8003::153` |
   | CNAME | `www` | `hatscat.github.io`   |

5. Once GitHub has issued the certificate (the Pages settings say so), tick "Enforce HTTPS".
   `www.lonebee.games` then redirects to `lonebee.games`.
6. After launch: share the link once to check the preview card; optionally add the site to Google
   Search Console; link the site from the itch.io profile and from both games' footers.

## Later

- Portfolio: `/about/` (story, skills, contact) and one page per game under `/games/<slug>/`, with
  the same header and footer.
- Press kit: logos, screenshots and fact sheet on one page, built from the design system's assets.
- Devlog or news, if itch.io devlogs aren't enough.
- The Draw my code itch.io page link on its card, once you confirm its address.

### Private game repositories

GitHub Pages serves a private repository only on a paid plan (GitHub Pro or above). Free options:

- Cloudflare Pages (or Workers static assets): the DNS is already on Cloudflare, so the subdomain
  is one click. Builds from a private repository, or receives a folder from a GitHub Action.
- Netlify: the same idea; the subdomain is a DNS-only `CNAME` to the Netlify site.
- Keep the source private and publish only the built game to a public repository from a GitHub
  Action, then serve that one with GitHub Pages.
