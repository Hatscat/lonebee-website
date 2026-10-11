# Header

The top of every page: the logo, a link home, and the site's navigation.

## Markup

```html
<header class="site-header">
  <div class="wrap header-bar">
    <a class="brand" href="/">
      <picture>
        <source media="(max-width: 479px)" srcset="/img/mark.svg" width="64" height="64">
        <img src="/img/logo.svg" width="258" height="64" alt="Lone Bee, home">
      </picture>
    </a>
    <nav class="site-nav" aria-label="Site">
      <ul>
        <li><a href="#games">Games</a></li>
        <li><a href="#follow">Follow</a></li>
      </ul>
    </nav>
  </div>
</header>
```

## Rules

- The logo is the lockup at 2x (mark and wordmark, 258×64); under 480px wide, the mark alone at 2x
  (64×64), so the navigation keeps its room.
- On the home page (`body.page-home`) the bar is `sky-top`: the night of the hero art's top rows,
  so the sky runs on behind the logo. Elsewhere, it sits on `bg`.
- Navigation links in `label`, `text`; `accent` and underlined under the pointer and for the current
  page (`aria-current="page"`). Each is at least `tap-min` (44px) tall.
- The skip link comes before it (see SkipLink).

## Tokens

`sky-top`, `bg`, `text` (14.59:1 on `sky-top`), `accent`, `label`, `space-2`, `space-3`, `space-4`,
`tap-min`, `mark-size`, `gutter`, `gutter-narrow`, `content-max`.
