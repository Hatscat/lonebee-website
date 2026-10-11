# GameCard

A game, on a card: its own art in a 40:21 well, its name, one line of pitch, its platforms and its
actions. A card in the works trades its frame for dotted pixels and has no actions.

## When to use it

- **Released** (`.card`): every game players can play, in the Games section.
- **In the works** (`.card.card-next`): announced games, in the In the works section. No dates, no
  actions, no promise the game can't keep.

## Markup

```html
<li>
  <article class="card" aria-labelledby="limpid-chess">
    <img class="card-image" src="/img/games/limpid-chess.webp" width="952" height="500"
      alt="Three moves drawn as arrows on a chess board, then the answer, with the best move checked in green" loading="lazy">
    <div class="card-body">
      <h3 class="card-title" id="limpid-chess"><a href="https://limpidchess.lonebee.games/">Limpid Chess</a></h3>
      <p class="card-text">A smooth chess game where every turn shows three moves: find the best one.</p>
      <ul class="tags"><li>Android</li><li>Web</li></ul>
      <ul class="actions">
        <li><a class="button button-primary" href="https://limpidchess.lonebee.games/play/">Play in the browser</a></li>
        <li><a class="button" href="https://play.google.com/store/apps/details?id=game.limpidchess">Get it on Google Play</a></li>
      </ul>
    </div>
  </article>
</li>
```

Cards sit in `<ul class="cards">`: one column, two from 900px wide.

## Content

- **Image (released games)**: the game's own art, never a studio redraw: its link preview
  (1200×630) or its store graphic cropped to 40:21, as WebP. Its alt text describes what the image
  shows, without repeating the game's name, which the title gives next.
- **Image (in the works)**: a 160×84 pixel art tile drawn by the studio, decorative (`alt=""`);
  `.card-next` sets `pixelated`.
- **Title**: the game's exact name in `display-l` (`display-m` under 480px), a link to its own site.
- **Pitch**: one sentence in `text-muted`, the game's own tagline when it has one.
- **Tags**: platforms (see Tag).
- **Actions**: at most one primary (to play), then the stores.

## Look

`surface` fill in `shadow-frame` (a notched `border` frame); image well `sunken`; body padding
`space-6` (`space-4` on phones), `space-4` between its parts. In the works: a dotted frame of
`border-strong` dots one `pixel` wide, one pixel apart, drawn with hard-stop gradients.

## Tokens

`surface`, `sunken`, `border`, `border-strong`, `text`, `text-muted` (7.95:1 on `surface`),
`accent` (title link on hover), `display-l`, `display-m`, `body`, `space-4`, `space-6`, `pixel`,
`drop`, `shadow-frame`.
