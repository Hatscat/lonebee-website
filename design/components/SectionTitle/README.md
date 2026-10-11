# SectionTitle

A section's title: `display-l` (Jersey 10, 56px) with a hard `shadow-title-small`, after a small
pixel icon that says what the section holds.

## The icons

| Icon | File | Section |
| --- | --- | --- |
| A full comb cell | `comb-full.svg` | What is out: Games |
| A half-filled comb cell | `comb-half.svg` | What is in the works |
| A twinkle | `twinkle.svg` | Where to follow along |

The icons are 20 by 20 or 22 CSS pixels: their art at 2x (the twinkle at 4x), decorative (`alt=""`).

## Markup

```html
<h2 id="games-title" class="section-title"><img src="/img/ui/comb-full.svg" width="20" height="22" alt="">Games</h2>
```

The section points at its title: `<section aria-labelledby="games-title">`. A lead may follow, in
`.section-lead` (`lead`, `text-muted`).

## Do

- Use one to three words, in sentence case: "Games", "In the works", "Follow".
- Set it at 56px only: Jersey 10 is pixel-crisp at 56px and 112px.

## Tokens

`display-l`, `text`, `shadow-title-small`, `space-4` (icon gap), `lead`, `text-muted`.
