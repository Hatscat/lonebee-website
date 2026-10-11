# Footer

The end of every page, sunk into `sunken`: the small logo, and one line of fine print.

## Markup

```html
<footer class="site-footer">
  <div class="wrap footer-bar">
    <img src="/img/logo-small.svg" width="125" height="32" alt="">
    <p>© Lone Bee · No cookies, no tracking.</p>
  </div>
</footer>
```

## Rules

- The logo is the lockup at 1x with the plain O (`logo-small.svg`): at 1x the honey cell would read
  as a cup. It is decorative here (`alt=""`): the line beside it names the studio.
- `small` text in `text-muted` (9.71:1 on `sunken`). Separate facts with a middle dot.
- "No cookies, no tracking." stays only as long as it is true: adding analytics removes it.

## Tokens

`sunken`, `text-muted`, `small`, `space-4`, `space-6`, `space-8`, `space-16`, `space-24`.
