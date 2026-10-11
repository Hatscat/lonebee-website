# Button

A pixel button: its fill grown by a notched frame of one UI pixel, standing on a hard drop. The
primary button is the one main action of a block; the secondary button carries the others.

## When to use it

- **Primary** (`.button.button-primary`): the action the block exists for. "See the games" in the
  hero, "Play in the browser" on a game card, "Follow on itch.io" in the Follow section. At most
  one per block, once or twice per screen: gold is scarce.
- **Secondary** (`.button`): every other action. "Follow on itch.io" in the hero, "Get it on Google
  Play" on a card.
- Not for links inside running text (use a Link), nor for navigation (the Header's links).

## Markup

Buttons that lead somewhere are links; buttons that act are `<button type="button">`. Group them in
a list: the `.actions` list wraps and spaces them.

```html
<ul class="actions">
  <li><a class="button button-primary" href="https://limpidchess.lonebee.games/play/">Play in the browser</a></li>
  <li><a class="button" href="https://play.google.com/store/apps/details?id=game.limpidchess">Get it on Google Play</a></li>
</ul>
```

Labels say what happens, in sentence case: "Play today's puzzle", never "Play now!".

## States

| State | Primary | Secondary | Without color alone |
| --- | --- | --- | --- |
| Rest | `accent` fill, `on-accent` label, `shadow-button` (gold frame, amber drop) | `surface` fill, `text` label, `shadow-button-secondary` (tawny frame, comb-black drop) | The frame and drop say "button" |
| Hover | `accent-hover`, `shadow-button-hover` | `surface-hover`, frame turns `beeswax` (`shadow-button-secondary-hover`) | The frame brightens |
| Pressed | Moves by `drop` (4px) onto its shadow: `shadow-button-pressed` | Same: `shadow-button-secondary-pressed` | It travels |
| Focus | A `focus` ring, `focus-width`, `focus-offset-button` (8px) away, past the drop | Same | A ring |
| Disabled | `aria-disabled="true"`: `surface` fill, `text-faint` label, `shadow-frame`, no drop, no hover | Same | The drop is gone, the label is faint |
| On the hero art | As at rest | Its frame starts `beeswax`, to stand out on the sky | |

States change at once, like a sprite swapping frames: no transition.

## Do

- Keep one primary per block, and its label the most specific action ("Play today's puzzle").
- Disable with `aria-disabled="true"`, never `disabled`, so the button keeps its focus ring, and say
  nearby why it is unavailable.
- Leave `space-6` around buttons: their frame and drop take 6px outside the box.

## Don't

- Don't round the corners, blur the drop or fade the button with opacity.
- Don't put two primary buttons side by side.
- Don't add icons or emoji to labels.

## Tokens

`accent`, `accent-hover`, `accent-edge`, `on-accent`, `surface`, `surface-hover`, `text`,
`text-faint`, `border-strong`, `focus`, `label` (type), `space-3`, `space-6`, `tap-min`, `drop`,
`focus-width`, `focus-offset-button`, `shadow-button`, `shadow-button-hover`,
`shadow-button-pressed`, `shadow-button-secondary`, `shadow-button-secondary-hover`,
`shadow-button-secondary-pressed`, `shadow-frame`.

Contrast: `on-accent` on `accent` 12.46:1, `on-accent` on `accent-hover` 16.00:1, `text` on
`surface` 13.15:1, `text-faint` on `surface` 4.70:1.
