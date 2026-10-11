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

- **The art** is 300×150 pixels, drawn in code. CSS covers the box with it (`object-fit: cover`,
  focused on the bee and the sun); `hero.js` then sizes it at a whole number of device pixels per
  art pixel, so every pixel is the same size, and animates it on a canvas at 12 frames per second:
  the wings beat, the bee flies one small figure-eight and the stars twinkle, starting from the very
  frame the still image shows and ending on it, within five seconds. Reduced motion keeps the still;
  off screen, the loop pauses. Without JavaScript, the still image is the hero.
- **Height**: `clamp(hero-min, hero-fluid, hero-max)` while the copy follows the art; from 1100px
  wide, `clamp(hero-wide-min, hero-wide-fluid, hero-max)` with the copy on the art. In Windows
  high-contrast modes the copy always follows the art, so focus rings never land on its sky.
- **The copy** sits on the art's calm left sky from 1100px wide. The art keeps that part of its sky
  dark by rule (only night, dusk and slate, a few dim stars, dark hills), and a test checks every
  text and control pixel against the art under it at a dozen widths.
- **Title** in `display-xl` (112px) with `shadow-title` from 720px wide, `display-l` (56px) with
  `shadow-title-small` below.
  **Tagline** in `lead`, `text`: "I craft games with ♥", the heart a pixel glyph read aloud as
  "love". Buttons: see Button.

## Tokens

`hero-sky`, `hero-min`, `hero-wide-min`, `hero-fluid`, `hero-wide-fluid`, `hero-max`, `display-xl`, `display-l`, `lead`, `text`,
`shadow-title`, `shadow-title-small`, `space-4`, `space-8`, `space-12`, `layer-art`,
`layer-content`.
