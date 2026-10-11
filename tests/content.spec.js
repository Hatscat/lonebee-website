// @ts-check
import { expect, test } from "@playwright/test";

/** The released games, as the cards must present them. Add a game here when you add its card. */
const GAMES = [
  {
    name: "Limpid Chess",
    site: "https://limpidchess.lonebee.games/",
    platforms: ["Android", "Web"],
    actions: [
      ["Play in the browser", "https://limpidchess.lonebee.games/play/"],
      ["Get it on Google Play", "https://play.google.com/store/apps/details?id=game.limpidchess"],
    ],
  },
  {
    name: "Draw my code",
    site: "https://drawmycode.lonebee.games/",
    platforms: ["Web"],
    actions: [["Play today's puzzle", "https://drawmycode.lonebee.games/"]],
  },
];

/** The games in the works. */
const NEXT = [
  { name: "Draw my code Kids", platforms: ["Mobile"] },
  { name: "Truth Table Game", platforms: ["Web", "Mobile"] },
];

const ITCH = "https://lone-bee.itch.io/";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the hero names the studio and leads to the games and to itch.io", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lone Bee");
  const hero = page.locator(".hero");
  await expect(hero.getByRole("link", { name: "See the games" })).toHaveAttribute("href", "#games");
  await expect(hero.getByRole("link", { name: "Follow on itch.io" })).toHaveAttribute("href", ITCH);
});

test("the navigation leads to sections that exist", async ({ page }) => {
  const links = page.getByRole("navigation", { name: "Site" }).getByRole("link");
  await expect(links).toHaveText(["Games", "Follow"]);
  for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
    await expect(page.locator(/** @type {string} */ (href))).toHaveCount(1);
  }
});

test("every released game has a complete card", async ({ page }) => {
  const cards = page.locator("#games article");
  await expect(cards).toHaveCount(GAMES.length);
  for (const [i, game] of GAMES.entries()) {
    const card = cards.nth(i);
    await expect(card).toHaveAccessibleName(game.name);
    await expect(card.getByRole("heading", { level: 3 })).toHaveText(game.name);
    await expect(card.getByRole("heading", { level: 3 }).getByRole("link")).toHaveAttribute("href", game.site);
    await expect(card.locator(".card-text")).not.toBeEmpty();
    await expect(card.getByRole("img")).toHaveAttribute("alt", /\S/);
    await expect(card.locator(".tags li")).toHaveText(game.platforms);
    const actions = card.locator(".actions a");
    await expect(actions).toHaveText(game.actions.map(([text]) => text));
    for (const [j, [, href]] of game.actions.entries()) await expect(actions.nth(j)).toHaveAttribute("href", href);
  }
});

test("games in the works are listed, without links", async ({ page }) => {
  const section = page.locator("#in-the-works");
  const cards = section.locator("article");
  await expect(cards).toHaveCount(NEXT.length);
  for (const [i, game] of NEXT.entries()) {
    const card = cards.nth(i);
    await expect(card.getByRole("heading", { level: 3 })).toHaveText(game.name);
    await expect(card.locator(".tags li")).toHaveText(game.platforms);
    await expect(card.getByRole("link")).toHaveCount(0);
  }
  await expect(section.locator(".section-note")).toContainText("Roblox");
  await expect(section.locator(".section-note")).toContainText("CrazyGames");
});

test("followers find itch.io, GitHub and the email address", async ({ page }) => {
  const follow = page.locator("#follow");
  await expect(follow.getByRole("link", { name: "Follow on itch.io" })).toHaveAttribute("href", ITCH);
  await expect(follow.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/Hatscat");
  await expect(follow.getByRole("link", { name: "lone.bee.dev@gmail.com" })).toHaveAttribute("href", "mailto:lone.bee.dev@gmail.com");
});

for (const path of ["/", "/404.html"]) {
  test(`${path}: links are safe and stay in the tab`, async ({ page }) => {
    await page.goto(path);
    const links = await page.locator("a").evaluateAll((as) =>
      as.map((a) => ({ href: a.getAttribute("href") ?? "", target: a.getAttribute("target") })),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const { href, target } of links) {
      expect(href, "https, an anchor, the home page (or one of its anchors) or an email").toMatch(
        /^(https:\/\/|#[a-z][\w-]*$|\/(#[a-z][\w-]*)?$|mailto:)/,
      );
      expect(target).toBeNull();
      if (href.startsWith("#")) await expect(page.locator(href)).toHaveCount(1);
    }
  });

  test(`${path}: images carry alt text and their size`, async ({ page }) => {
    await page.goto(path);
    const images = await page.locator("img").evaluateAll((imgs) =>
      imgs.map((img) => ({ src: img.getAttribute("src"), alt: img.getAttribute("alt"), w: img.getAttribute("width"), h: img.getAttribute("height") })),
    );
    for (const image of images) {
      expect(image.alt, `${image.src} has an alt attribute`).not.toBeNull();
      expect(image.w, `${image.src} has a width`).toMatch(/^\d+$/);
      expect(image.h, `${image.src} has a height`).toMatch(/^\d+$/);
    }
  });

  test(`${path}: one h1, and heading levels never skip`, async ({ page }) => {
    await page.goto(path);
    const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((hs) => hs.map((h) => Number(h.tagName[1])));
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1);
    });
  });

  test(`${path}: the copy is finished, in US English`, async ({ page, request }) => {
    const source = await (await request.get(path)).text();
    expect(source, "no unfilled placeholder").not.toMatch(/\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/);
    await page.goto(path);
    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const word of ["lorem", "todo", "colour", "favourite", "behaviour", "centre", "organise", "licence", "grey"]) {
      expect(text, `"${word}"`).not.toContain(word);
    }
  });
}
