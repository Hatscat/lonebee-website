# SkipLink

"Skip to content": the first focusable element of every page, hidden above the top edge until a
keyboard user tabs to it, then shown as a pressed primary button.

## Markup

```html
<a class="skip-link" href="#main">Skip to content</a>
…
<main id="main" tabindex="-1">…</main>
```

`tabindex="-1"` lets `main` take the focus the link sends it; it shows no ring of its own.

## Tokens

`accent`, `on-accent`, `label`, `shadow-button-pressed`, `layer-skip`, `space-3`, `space-4`,
`space-6`, `space-12`.
