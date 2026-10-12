# Hero

The opening of the home page: the golden-hour scene full width, the studio's name, one line, and two
buttons. The art moves like a game; the words stay put.

## Markup

```html
<section class="hero" aria-labelledby="hero-title">
  <div class="hero-art" data-hero>
    <img src="/img/hero.png" width="300" height="150" alt="" fetchpriority="high">
  </div>
  <div class="wrap hero-copy">
    <h1 id="hero-title" class="hero-title">Lone Bee</h1>
    <p class="hero-tagline">I craft games with <img class="glyph" src="/img/ui/heart.svg" width="14" height="12" alt="love"></p>
    <ul class="actions">
      <li><a class="button button-primary" href="#games">See the games</a></li>
      <li><a class="button" href="https://lone-bee.itch.io/">Follow on itch.io</a></li>
    </ul>
  </div>
</section>
<script type="module" src="/js/hero.js"></script>
```

## Rules

- **The art** is 300×150 pixels, drawn in code, pinned to the bottom right of its box: a box of
  another shape crops its left (phones) or its top (wide screens), never the meadow or the light.
  CSS covers the box with it (`object-fit: cover`, `object-position: 100% 100%`); `hero.js` then
  sizes it at a whole number of device pixels per art pixel, so every pixel is the same size. When
  the next whole size would crop more than the art's 21 rows of night off its top, it takes the
  size under it, if that still spans the width, and leaves up to 30 rows of night above the art
  instead: the box is `sky-top`, the same night, so header, band and sky read as one. From 1100px,
  where the box is about 2:1 or wider, a size smaller rarely spans it, so some windows crop past
  the night (see Pixel art in the brand book).
- **Motion**: `hero.js` animates the art on a canvas at 12 frames per second: the wings beat, the
  bee flies one small figure-eight and the stars twinkle, starting from the very frame the still
  image shows and ending on it, within five seconds. A click on the art (not on the copy or by its
  buttons) plays one more loop, on from where the bee is; a click with half a loop or more still to
  fly adds nothing, so clicks never stack. Reduced motion keeps the still; while the bee is out of
  view, or the tab hidden, the loop pauses. Without JavaScript, the still image is the hero.
- **Replay**, for the keyboard: a button (`.button.hero-replay`, "Replay", named "Replay the
  animation") that `hero.js` adds after the copy's buttons. Like the skip link, it is out of sight until it
  has keyboard focus; it then shows under the copy's buttons: on the art's dark sky from 1100px,
  on the page under 1100px and in forced colors. Pressed with the bee out of view, it scrolls the
  bee back. Reduced motion removes it.
- **Height**: under 1100px, `clamp(hero-min, hero-fluid, hero-max)`; from 1100px wide,
  `clamp(hero-wide-min, hero-wide-fluid, max(hero-max, hero-fold, hero-bee-min))`, forced colors
  included: 2:1 where it fits, up to the first screen, never short enough to crop the bee (at a
  browser zoom of 67% or more). In Windows high-contrast modes the copy follows the art, so focus
  rings never land on its sky.
- **The copy** sits on the art's calm left sky from 1100px wide. The art keeps that part of its sky
  dark by rule (only night, dusk and slate, a few dim stars, dark hills), and a test checks every
  text and control pixel against the art under it at a dozen widths.
- **Title** in `display-xl` (112px) with `shadow-title` from 720px wide, `display-l` (56px) with
  `shadow-title-small` below.
  **Tagline** in `lead`, `text`: "I craft games with ♥", the heart a pixel glyph read aloud as
  "love". Buttons: see Button.

## Tokens

`hero-sky`, `sky-top`, `hero-min`, `hero-wide-min`, `hero-fluid`, `hero-wide-fluid`, `hero-max`, `hero-fold`, `hero-bee-min`, `display-xl`, `display-l`, `lead`, `text`,
`shadow-title`, `shadow-title-small`, `space-4`, `space-8`, `space-12`, `layer-art`,
`layer-content`.
