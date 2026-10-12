// @ts-check
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const path of ["/", "/no/such/page"]) {
  test(`${path}: axe finds no violation`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(summary).toEqual([]);
  });

  test(`${path}: landmarks and language`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Site" })).toHaveCount(1);
  });
}

/**
 * The key that moves focus to the next link: WebKit on macOS, like Safari, tabs to links with
 * Option+Tab only; on Linux, where CI runs, Tab does.
 * @param {string} browserName
 */
const tabKey = (browserName) => (browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");

test.describe("keyboard", () => {
  test("the skip link comes first, shows, and takes focus into the content", async ({ page, browserName }) => {
    await page.goto("/");
    await page.keyboard.press(tabKey(browserName));
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator(".hero").getByRole("link", { name: "See the games" })).toBeFocused();
  });

  test("after a click on text, Tab goes on from there", async ({ page, browserName }) => {
    await page.goto("/");
    await page.locator("#follow .section-lead").click();
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator("#follow").getByRole("link", { name: "Follow on itch.io" })).toBeFocused();
  });

  test("every control can be reached, and shows a clear focus ring", async ({ page, browserName }) => {
    await page.goto("/");
    // hero.js adds Replay once the art's frames have loaded: count it in.
    await expect(page.locator(".hero-replay")).toBeAttached();
    const expected = await page.locator("a[href], button, [tabindex='0']").count();
    // Tab until focus comes back to an element already visited, or leaves the page: past the last
    // control, browsers move focus to their own interface.
    for (let i = 0; i < expected + 2; i++) {
      await page.keyboard.press(tabKey(browserName));
      const focus = await page.evaluate(() => {
        const el = /** @type {HTMLElement | null} */ (document.activeElement);
        if (!el || el === document.body || !document.hasFocus() || el.dataset.visited) return null;
        el.dataset.visited = "";
        const style = getComputedStyle(el);
        return {
          name: `${el.tagName.toLowerCase()} ${el.getAttribute("aria-label") || (el.textContent ?? "").trim() || el.getAttribute("href")}`,
          outline: style.outlineStyle !== "none" ? parseFloat(style.outlineWidth) : 0,
        };
      });
      if (!focus) break;
      expect(focus.outline, `${focus.name}: a focus ring of 2px or more`).toBeGreaterThanOrEqual(2);
      // Smooth scrolling brings the focused control into view over a few frames.
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const rect = document.activeElement?.getBoundingClientRect();
              return !!rect && rect.bottom > 0 && rect.top < innerHeight;
            }),
          // Generous: a smooth scroll can take seconds when every core runs a browser.
          { message: `${focus.name}: scrolled into view`, timeout: 10_000 },
        )
        .toBe(true);
    }
    await expect(page.locator("[data-visited]"), "every control is reached once").toHaveCount(expected);
  });
});

test("in forced colors, Replay shows off the art, where the theme's focus ring meets the theme's ground", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "forced colors are emulated in Chromium only");
  // The art keeps its own colors in forced colors; a theme's ring on it could vanish.
  for (const width of [390, 1440]) {
    for (const colorScheme of /** @type {const} */ (["light", "dark"])) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ forcedColors: "active", colorScheme });
      await page.goto("/");
      const replay = page.getByRole("button", { name: "Replay the animation" });
      await expect(replay).toBeAttached();
      await page.locator(".hero").getByRole("link", { name: "Follow on itch.io" }).focus();
      await page.keyboard.press("Tab");
      await expect(replay).toBeFocused();
      const seen = await replay.evaluate((b) => {
        const s = getComputedStyle(b);
        const ring = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
        const r = b.getBoundingClientRect();
        const art = /** @type {Element} */ (document.querySelector(".hero-art")).getBoundingClientRect();
        const apart = r.top - ring >= art.bottom || r.bottom + ring <= art.top || r.left - ring >= art.right || r.right + ring <= art.left;
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), apart };
      });
      const where = `${width}px, ${colorScheme}`;
      expect(seen.style, where).toBe("solid");
      expect(seen.width, where).toBeGreaterThanOrEqual(2);
      expect(seen.apart, `${where}: the focused Replay and its ring stay off the art`).toBe(true);
    }
  }
});

test("a drag can select into a button's label: the button's wider hit area lies under it", async ({ page }) => {
  await page.goto("/");
  const lead = page.locator("#follow .section-lead");
  const button = page.locator("#follow").getByRole("link", { name: "Follow on itch.io" });
  await button.scrollIntoViewIfNeeded();
  const [from, to] = await Promise.all([lead.boundingBox(), button.boundingBox()]);
  if (!from || !to) throw new Error("no boxes");
  await page.mouse.move(from.x + 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => String(document.getSelection())), "the selection reaches the label").toContain("Follow o");
});

test("reduced motion turns every transition and animation off", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const moving = await page.evaluate(() =>
    [...document.querySelectorAll("*")]
      .map((el) => ({ el, style: getComputedStyle(el) }))
      .filter(({ style }) =>
        style.transitionDuration.split(",").some((d) => parseFloat(d) > 0) ||
        (style.animationName !== "none" && style.animationDuration.split(",").some((d) => parseFloat(d) > 0)),
      )
      .map(({ el }) => el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(" ").join(".")}` : "")),
  );
  expect(moving).toEqual([]);
  await context.close();
});

for (const width of [375, 1440]) {
  test(`text spacing can be raised without losing content at ${width}px (WCAG 1.4.12)`, async ({ browser }) => {
    // The site's CSP forbids injected styles, which this check needs.
    const context = await browser.newContext({ bypassCSP: true, viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto("/");
    await page.addStyleTag({
      content:
        "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }",
    });
    const result = await page.evaluate(() => {
      const hero = /** @type {HTMLElement} */ (document.querySelector(".hero")).getBoundingClientRect();
      const copy = /** @type {HTMLElement} */ (document.querySelector(".hero-copy")).getBoundingClientRect();
      const texts = [...document.querySelectorAll("h1, h2, h3, p, li, a")].filter((el) => !el.closest(".skip-link"));
      const overlaps = [];
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const [a, b] = [texts[i], texts[j]];
          if (a.contains(b) || b.contains(a)) continue;
          const [r, q] = [a.getBoundingClientRect(), b.getBoundingClientRect()];
          const w = Math.min(r.right, q.right) - Math.max(r.left, q.left);
          const h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
          if (w > 1 && h > 1) overlaps.push(`${a.textContent?.trim().slice(0, 30)} / ${b.textContent?.trim().slice(0, 30)}`);
        }
      }
      return { copyInside: copy.bottom <= hero.bottom + 0.5, overlaps, scroll: document.documentElement.scrollWidth - innerWidth };
    });
    expect(result.copyInside, "the hero copy stays inside the hero").toBe(true);
    expect(result.overlaps).toEqual([]);
    expect(result.scroll).toBeLessThanOrEqual(0);
    await context.close();
  });
}

test("every link and button can be tapped: tap-min tall or more", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const page = await context.newPage();
  for (const path of ["/", "/no/such/page"]) {
    await page.goto(path);
    const small = await page.evaluate(() => {
      const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tap-min"));
      return [...document.querySelectorAll("a[href], button")]
        .filter((el) => !el.classList.contains("skip-link"))
        .map((el) => ({ name: el.textContent?.trim() || el.getAttribute("href"), height: el.getBoundingClientRect().height }))
        .filter((t) => t.height < min - 0.5)
        .map((t) => `${t.name}: ${t.height.toFixed(1)}px`);
    });
    expect(small, path).toEqual([]);
  }
  await context.close();
});
