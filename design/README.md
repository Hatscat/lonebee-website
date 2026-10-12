Lone Bee is a one-person game studio. Its identity is **Hive and amber**: the warm dark of the hive
holds every page, honey gold marks only what matters, beeswax cream carries the words, and one cool
note of dusk sky marks links and focus. Outside the hive, the same palette paints a lone honeybee
over a valley of the Pyrenees at golden hour.

One rule holds it together: **one palette of 32 colors paints both the pixel art and every color of
the interface.** A color that is not in the palette doesn't exist.

Every value is a token, defined in `tokens.json` and generated into the site's `tokens.css`. Colors,
spacing, borders, radii, shadows, layout values and layers keep their names as CSS custom properties
(`bg` is `var(--bg)`); a type style is a font shorthand, `--type-<style>` (`font: var(--type-body)`);
a font family is `--font-<family>`. The site's stylesheet uses tokens only: a test fails on any raw
color, and on any raw length outside a media query.

## Voice and copy

- Write short, plain sentences, in the first person: "I craft games with ♥". No hype
  words (no "amazing", "epic", "revolutionary").
- US English: color, center, favorite.
- Sentence case for every heading, button and link: "Play today's puzzle", never "Play Today's
  Puzzle". Uppercase only inside pixel art (the wordmark, captions in images).
- Name each game exactly: **Limpid Chess**, **Draw my code**, **Draw my code Junior**, **Truth
  Table Game**. Lead Limpid Chess with the word "smooth", as its own site does.
- Every claim must hold for every game, the future ones included: no blanket "free" or "no ads".
- Buttons say what happens: "Play in the browser", "Get it on Google Play", "Follow on itch.io".
- Separate facts with a middle dot: "© Lone Bee · No cookies · Crafted with ♥ in the Pyrenees"
- One bee wink per page at most: "Also in the hive: a Roblox game…", "This page flew away." Never a
  pun in a button.
- No emoji. Where a symbol says it better than a word (the heart, the French flag, a peak), use
  the brand's pixel glyphs (`.glyph`, 2x), with alt text that reads as the word: "love",
  "France"; a purely decorative one gets `alt=""`. They match the art and look the same on
  every system, where emoji vary (Windows draws the French flag as the letters "FR").

## Color

### The palette

Seven hue-shifted ramps, darkest first. Shadows drift cool (toward wine and slate), highlights drift
warm (toward gold and pollen).

| Ramp     | Colors                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| Propolis | `comb-black` #0c080b · `hive` #1a1211 · `propolis` #2a1d19 · `bark` #422d24 · `umber` #634430 · `tawny` #8f6943 |
| Honey    | `burnt-comb` #6e2815 · `amber` #ad451a · `marmalade` #dd6f20 · `honey` #f39c2e · `gold` #fac54a · `pollen` #fde68e |
| Beeswax  | `old-wax` #9c8670 · `wax` #c9b28e · `beeswax` #f3e6c6 · `sunlight` #fffaea                                   |
| Dusk     | `night` #111528 · `dusk` #1b2844 · `slate` #2a4462 · `deep-teal` #3c6b7c · `sky` #5c9d9f · `mist` #8fcdc0 · `glint` #c9eedc |
| Meadow   | `moss` #27391f · `grass` #4b6528 · `sunlit-grass` #8c9e3a                                                   |
| Heather  | `wine` #3d1830 · `heather` #77294a · `lavender` #9a85c8                                                     |
| Clover   | `clover` #bb4050 · `coral` #ec7560 · `peach` #f7b08a                                                        |

The same palette, ready for pixel art tools: `palette/lonebee.gpl` (import it in Pixelorama,
Aseprite, GIMP or Krita), `palette/lonebee.hex` (the Lospec format) and `palette/lonebee-1x.png`.

### Roles

| Role                    | Token           | Color        | Use                                                        |
| ----------------------- | --------------- | ------------ | ---------------------------------------------------------- |
| Page                    | `bg`            | `hive`       | The page background and the browser's theme color          |
| Raised                  | `surface`       | `propolis`   | Cards, secondary buttons                                   |
| Raised, under a pointer | `surface-hover` | `bark`       | Hover fills, platform tags                                 |
| Sunken                  | `sunken`        | `comb-black` | The footer, wells behind game art                          |
| Decorative edge         | `border`        | `umber`      | Card frames, dividers; never a control's only edge         |
| Control edge            | `border-strong` | `tawny`      | Secondary buttons, the dotted frame of games in the works  |
| Text                    | `text`          | `beeswax`    | Body text and headings                                     |
| Muted text              | `text-muted`    | `wax`        | Card text, leads, the footer                               |
| Faint text              | `text-faint`    | `old-wax`    | Disabled labels, fine print; never for anything needed     |
| Accent                  | `accent`        | `gold`       | Primary buttons; once or twice per screen                  |
| Accent, under a pointer | `accent-hover`  | `pollen`     | A primary button under the pointer                         |
| Accent ledge            | `accent-edge`   | `amber`      | The hard drop under a primary button                       |
| Text on accent          | `on-accent`     | `comb-black` | Labels of primary buttons                                  |
| Link                    | `link`          | `mist`       | Text links, underlined; `link-hover` (`glint`) on hover    |
| Focus                   | `focus`         | `glint`      | The focus ring, on every ground                            |
| Success                 | `success`       | `sky`        | Always with a word or a check glyph                        |
| Warning                 | `warning`       | `marmalade`  | Always with a word or a glyph: it is gold's neighbor       |
| Error                   | `danger`        | `coral`      | Always with a word or a cross glyph                        |
| Hero sky                | `hero-sky`      | `dusk`       | The flat sky behind the hero copy                          |
| Header sky              | `sky-top`       | `night`      | The home page's header bar, continuing the art's sky       |

### Rules

- Paint pages on `bg`, raise cards on `surface`, sink the footer and image wells into `sunken`.
- Keep gold scarce: the primary action and the bee. Everything else is brown, cream and one teal.
- Set text in `text` or `text-muted`; text on gold in `on-accent`. Every pair the site uses is
  checked by script against WCAG 2 (`meta.contrast` in `tokens.json`): `text` on `bg` 14.88:1,
  `text-muted` on `surface` 7.95:1, `on-accent` on `accent` 12.46:1, `link` on `bg` 10.24:1, `focus`
  on `bg` 14.71:1, `border-strong` on `bg` 3.75:1.
- Never show a state by color alone. Success, warning and error carry a word or a glyph; success
  is a bluish teal so it never relies on a red and green told apart.
- No tints, no opacity, no gradients: a gradient may only switch colors with hard stops (the dotted
  frame). No blur, anywhere.
- Don't invert the system into a cream page with amber accents: on light grounds, use the logo in
  `comb-black` on `beeswax`, and nothing else.

## Type

| Family                         | Role    | Where                                             |
| ------------------------------ | ------- | ------------------------------------------------- |
| **Jersey 10**                  | display | Titles only: the hero, sections, card titles      |
| **Atkinson Hyperlegible Next** | body    | Everything people read: text, buttons, navigation |
| **Atkinson Hyperlegible Mono** | mono    | Code and truth tables                             |

All three are SIL Open Font License faces from Google Fonts, self-hosted as Latin WOFF2 files.
Atkinson Hyperlegible was drawn by the Braille Institute for low-vision readers: distinct I l 1 and
0 O, open shapes, sturdy on dark grounds.

| Style        | Font          | Size / line | Use                                        |
| ------------ | ------------- | ----------- | ------------------------------------------ |
| `display-xl` | Jersey 10     | 112 / 112   | The hero title, from 720px wide            |
| `display-l`  | Jersey 10     | 56 / 56     | Section and card titles; the hero on phones |
| `display-m`  | Jersey 10     | 28 / 32     | Card titles under 480px only               |
| `lead`       | Atkinson Next | 20 / 32     | The hero tagline, section leads            |
| `body`       | Atkinson Next | 16 / 24     | Paragraphs, card text                      |
| `small`      | Atkinson Next | 14 / 20     | The footer, captions                       |
| `label`      | Atkinson Next, bold | 16 / 24 | Buttons, navigation                    |
| `tag`        | Atkinson Next, bold | 14 / 20 | Platform tags                          |
| `code`       | Atkinson Mono | 15 / 24     | Code, on `sunken`                          |

- **Set Jersey 10 at 56px or 112px, and at 28px only for card titles under 480px.** It is a pixel
  face: it renders pixel-crisp when its size in device pixels is a multiple of 56, so 56 and 112
  are crisp at whole-number pixel ratios (1x, 2x, 3x), and 28 at 2x only; fractional ratios soften
  every size. Measured, not guessed: at other sizes 15 to 50% of its edge pixels blur.
- Use each style as a font shorthand: `font: var(--type-body)`. Line heights sit on the 4px grid.
- Titles take a hard shadow: `shadow-title` on the hero title from 720px wide, `shadow-title-small`
  on every 56px title.
- Keep running text under `measure` (60 characters).

## Layout and spacing

- Space on a 4px grid: `space-1` (4px) to `space-24` (96px). Most of the page uses `space-4`,
  `space-6`, `space-8` and `space-24` between sections (`space-16` on phones).
- One column of content, left aligned, at most `content-max` (1200px) wide, with a `gutter` of
  24px each side (`gutter-narrow`, 16px, under 600px).
- Breakpoints: 480px (card titles grow), 600px (gutter), 720px (hero title), 900px (two columns
  of cards), 1100px (the hero copy moves onto the art).
- The hero art spans the full width. Under 1100px the copy follows it on `bg`; from 1100px the copy
  sits on the art's calm left sky, which the art keeps dark by rule (see Pixel art).
- The art is pinned to the bottom right of its box: a box of another shape crops its left (on
  phones) or its top (on wide screens), never the meadow or the light. From 1100px the hero is 2:1
  where it fits, grows up to the first screen (`hero-fold`), and never gets so short that a very
  wide screen crops the bee (`hero-bee-min`, at a browser zoom of 67% or more).
- Tap targets are at least `tap-min` (44px) tall.

## Shape: pixels, frames and drops

- **One UI pixel is 2px** (`pixel`). Every line, frame and notch is drawn in it.
- **Nothing is rounded** (`radius-none`). Corners are square, or notched by one UI pixel: a frame
  drawn as four hard shadows offset by 2px leaves its corners empty.
- **Shadows are hard**: offset, never blurred. Primary buttons sit on a 4px amber ledge
  (`shadow-button`), secondary ones on a comb-black drop (`shadow-button-secondary`). Pressed, a
  button travels 4px (`drop`) onto its own shadow.
- Cards take a notched umber frame (`shadow-frame`). Games in the works take a **dotted frame**
  instead: dots of one UI pixel in `border-strong`, one pixel apart.
- Platform tags are stretched comb cells: a `surface-hover` fill with stepped ends.
- In Windows high-contrast mode, shadows disappear: every frame falls back to a real border.

## Components

- **Primary button** (`.button.button-primary`): the one main action of a block ("See the games",
  "Play in the browser"). `accent` fill, `on-accent` label in `label`, `shadow-button`. Hover:
  `accent-hover` and `shadow-button-hover`. Pressed: moves by `drop`, `shadow-button-pressed`.
- **Secondary button** (`.button`): the other actions ("Follow on itch.io", "Get it on Google
  Play"). `surface` fill, `text` label, `shadow-button-secondary`; hover turns the frame `beeswax`
  and the fill `surface-hover`. On the hero art, the frame starts `beeswax`, to stand out on the sky.
- **Disabled button**: keep it focusable with `aria-disabled="true"`, label in `text-faint`, no
  drop, no hover change. Never fade a whole button: its focus ring would fade too.
- **Link**: `link`, underlined by one UI pixel, `link-hover` on hover.
- **Focus**: a solid `focus` ring, `focus-width` (2px), `focus-offset` (4px) away, and
  `focus-offset-button` (8px) around buttons, past their frame and drop.
- **Game card**: the game's own art in a 40:21 well, the title in `display-l` (a link to the game's
  site), one line of pitch in `text-muted`, platform tags, then its actions: at most one primary.
- **Card in the works**: the same card with a dotted frame and no actions.
- **Section title**: `display-l` with `shadow-title-small`, after a small pixel icon: a full comb
  cell for what is out, a half-filled one for what is in the works, a twinkle for Follow.
- **Header**: the logo (a link home) and the navigation. On the home page its bar is `sky-top`, the
  night of the hero art's top rows, so the sky runs on behind the logo.
- **Footer**: `sunken`, `small` text in `text-muted`, the small logo.
- **Skip link**: the first focusable element of every page, hidden until focused, styled as a
  primary button.

## Logo

- **The mark**: a worker honeybee in flight, seen from the side, facing right: a large compound
  eye, a fuzzy thorax, a striped abdomen, raised translucent wings, a pollen load. 32×32 pixels,
  with its own 16×16 cut for favicons (drawn, never downscaled).
- **The wordmark**: "LONE BEE" in a bitmap typeface drawn for it. Its O is a honey cell, half full.
  Under 2x, use the plain O: the small cell reads as a cup.
- **The lockup**: the mark left of the wordmark, the bee facing the word, both at the same pixel
  scale, 6 pixels apart. It is the logo in the header (2x) and the footer (1x, plain O).
- **Clear space**: one comb cell, 8 art pixels, on every side.
- **Smallest**: the lockup at 1x (32px tall); the mark at 16px, its own cut.
- **Grounds**: `hive`, `propolis`, `comb-black`, `dusk`. On a light ground, only `beeswax`, with the
  `comb-black` ink and no shade.
- **Never**: on `gold` or on busy art; stretched, scaled by a fraction, rotated, outlined, glowing,
  recolored beyond its two inks, or with the bee facing away from the word.

## Motion

- The interface doesn't tween: hover and press change at once, like a sprite swapping frames.
- The hero art moves like a game: 12 frames per second, whole pixels only. The bee's wings beat,
  it flies one small figure-eight (the shape of a honeybee's waggle dance) and the stars twinkle;
  then it rests on the still frame. Motion that starts by itself stops within five seconds, so no
  pause button is needed (WCAG 2.2.2).
- A click on the art plays one more loop, on from where the bee is, and so does Replay, a button
  that shows only on keyboard focus. Motion the visitor starts lasts six seconds at most, and
  clicks never stack.
- `prefers-reduced-motion` keeps the still image from the start, with no Replay. While the bee is
  out of view, or the tab hidden, the loop pauses.
- Nothing flashes more than three times a second.

## Pixel art

- Palette colors only, scaled by whole numbers only (nearest neighbor). On the web, use
  `image-rendering: pixelated` and sizes that are whole multiples of the art.
- No anti-aliasing beyond what palette colors give, no blur, no smooth gradients. Shade with ramps;
  blend bands with hatched strata (rows of horizontal dashes) or ordered dithering.
- One light per image. The brand's light is golden hour: a low sun, warm rims on the edges facing
  it, cool shadows (the 404 page is the blue hour after it, its glow fallen to heather). The
  interface's own pixels (the wordmark and its honey cell, titles, buttons) are lit from the upper
  left and cast their hard drops down and right; illustrations follow their scene's light (the
  mark from the upper right, the hero from the low sun on the right).
- One land: a valley of the Ariège Pyrenees, where Lone Bee lives, under the twin massif of the
  Montcalm and the Pic d'Estats. Snow on the summits, forest on the slopes, a lone mountain pine,
  and summer pasture: ling, gentians, red clover, carline thistles. New scenes stay in that valley.
- The bee is a real honeybee, never a cartoon: a head with a large compound eye and no pupil,
  elbowed antennae, a fuzzy thorax, a striped abdomen longer than the thorax, translucent veined
  wings, jointed legs, a pollen load.
- On dark grounds, keep the bee's silhouette whole: a cool rim (`slate`, `deep-teal`) under its dark
  parts.
- In the hero, the sky behind the copy (columns 0 to 150, rows 0 to 105) stays dark: only `night`,
  `dusk`, `slate`, a few `deep-teal` stars and dark hills. Its first 21 rows are mostly night,
  down to the middle of its hatched edge into dusk, so cropping them leaves no seam under the
  night header. From 1100px some windows crop more, and the header then meets the dusk in a
  near-straight line: a 1080p browser window (22 to 28 rows), widths just past a multiple of 300
  device pixels (up to 30), short 21:9 windows (32 to 36, through the clouds and the evening star).
  The last 6 rows are `hive`, so the art melts into the page. Tests enforce all three.
- Everything is drawn in code (`art/` in the website repository) and generated: change the source,
  never the image.

## Platforms

### itch.io

Project pages (Edit theme):

| Field                     | Value                                                      |
| ------------------------- | ---------------------------------------------------------- |
| BG                        | `hive` #1a1211                                             |
| BG 2                      | `propolis` #2a1d19 (BG2 Alpha 100)                         |
| Text                      | `beeswax` #f3e6c6                                          |
| Link                      | `mist` #8fcdc0                                             |
| Buttons (More options)    | `gold` #fac54a                                             |
| Headers (More options)    | leave empty, or `beeswax` #f3e6c6                          |
| Font                      | Atkinson Hyperlegible Next ("Select Google Font…"), Medium |
| Header font (More options)| Jersey 10                                                  |

The editor has no border color, and derives the buttons' text color itself. The content column is
960px wide by default.

Profile page (Edit theme): BG `hive`, Text `beeswax`, Link `mist`; Font Atkinson Hyperlegible Next,
size 100%; Banner `assets/itch-banner-960x240.png` in Fixed width; My Projects in Grid with
**B. Radius 0**, for square, pixel-sharp thumbnails.

Covers: itch.io asks for 315:250, at least 315×250, ideally **630×500**. Make them per game.

### Social and web

| Where                 | Size      | File                                  |
| --------------------- | --------- | ------------------------------------- |
| Link previews (Open Graph, X) | 1200×630 | `img/og.png` on the website      |
| X header              | 1500×500  | `assets/x-header-1500x500.png` (the top and bottom 60px may be cropped) |
| Avatars (X, itch.io, Discord) | 400×400 | `assets/avatar-400.png`         |
| Discord server banner | 960×540   | `assets/discord-banner-960x540.png` (no text or logo, as Discord asks) |
| Store and app icons   | 512×512   | `assets/mark-on-hive-512.png` (opaque) |

### Stores and portals

These assets belong to each game, in its own style; use the studio's for the studio's own pages.
Google Play: 512×512 icon (32-bit PNG, avoid transparency), 1024×500 feature graphic (no alpha).
App Store: 1024×1024 icon (no alpha). CrazyGames: three covers, 1920×1080, 800×1200 and 800×800,
with no text but the game's title. Roblox: a 512×512 icon and 1920×1080 thumbnails.

## Files

- `tokens.json`: every token, the source of `tokens.css`.
- `palette/`: the palette for pixel art tools.
- `assets/`: the logo and art, generated at whole-number scales.
- Fonts: `fonts/` on the website, each with its license.
