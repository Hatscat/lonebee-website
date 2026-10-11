# Tag

A platform tag: a stretched comb cell with stepped ends, in `surface-hover`, labeling where a game
runs.

## When to use it

- On game cards, for platforms only: "Android", "Web", "Mobile", "iOS", "Roblox", "CrazyGames".
- Not for statuses (a card in the works says so by its section and its dotted frame) or prices.

## Markup

```html
<ul class="tags">
  <li>Android</li>
  <li>Web</li>
</ul>
```

Sentence case, one word or a store's own name. No links inside: the card's buttons lead to the
stores.

## Look

`surface-hover` fill, `text` label in `tag` (Atkinson Hyperlegible Next bold, 14/20), padding
`space-1` by `space-4`, ends cut in steps of `pixel` and `drop` by a clip path. In Windows high
contrast, a real border replaces the cut ends.

## Tokens

`surface-hover`, `text` (10.38:1 on `surface-hover`), `tag` (type), `space-1`, `space-2` (between
tags), `space-4`, `pixel`, `drop`.
