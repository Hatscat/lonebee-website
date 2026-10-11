# Link

A text link: `link` (mist), underlined by one UI pixel, `link-hover` (glint) under the pointer. The
one cool note of the palette marks where words lead.

## When to use it

- Links that are words: "GitHub", an email address, a game's name in a card title (there it takes
  the title's color and no underline: the card is the context).
- Not for actions that deserve a button ("Follow on itch.io" is a Button), nor for navigation in
  the Header.

## Markup

```html
<ul class="links">
  <li><a href="https://github.com/Hatscat">GitHub</a></li>
  <li><a href="mailto:lone.bee.dev@gmail.com">lone.bee.dev@gmail.com</a></li>
</ul>
```

Plain `<a href>` to an https address, opening in the same tab: no `target="_blank"`. In a list,
`.links` gives each link a `tap-min` (44px) target.

## States

| State | Look |
| --- | --- |
| Rest | `link`, underline `pixel` (2px) thick, `space-1` (4px) under the text |
| Hover | `link-hover` |
| Focus | A `focus` ring, `focus-offset` (4px) away |

## Tokens

`link` (10.24:1 on `bg`, 9.05:1 on `surface`, 11.05:1 on `sunken`), `link-hover`, `focus`,
`pixel`, `space-1`, `label` (type, in `.links`), `tap-min`.
