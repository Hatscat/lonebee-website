// @ts-check
import { expect, test } from "@playwright/test";
import { PAGES, recordProblems } from "./helpers.js";

for (const { path, status } of PAGES) {
  test(`${path} loads without a single problem`, async ({ page }) => {
    // A missing page's own document answers 404 on purpose; nothing else may.
    const problems = recordProblems(page, {
      allowStatus: (url, code) => code === 404 && status === 404 && new URL(url).pathname === path,
    });
    const response = await page.goto(path);
    expect(response?.status()).toBe(status);
    // Load the lazy images too, then wait for the network to settle.
    await page.locator("img[loading=lazy]").evaluateAll((images) => {
      for (const image of images) if (image instanceof HTMLImageElement) image.loading = "eager";
    });
    await page.waitForLoadState("networkidle");
    const broken = await page.locator("img").evaluateAll((images) =>
      images
        .filter((image) => !(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute("src")),
    );
    expect(broken, "images that failed to load").toEqual([]);
    expect(problems).toEqual([]);
  });

  test(`${path} is styled by the site's stylesheets, fonts included`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const styled = await page.evaluate(async () => {
      await document.fonts.ready;
      const root = getComputedStyle(document.documentElement);
      return {
        bg: root.getPropertyValue("--bg").trim(),
        body: getComputedStyle(document.body).backgroundColor,
        fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")),
      };
    });
    // Root-relative URLs resolve from nested paths too: the tokens apply everywhere.
    expect(styled.bg).toMatch(/^#[0-9a-f]{6}$/);
    expect(styled.body).not.toBe("rgba(0, 0, 0, 0)");
    expect(styled.fonts, "the display and body fonts loaded").toEqual(expect.arrayContaining(["Jersey 10", "Atkinson Hyperlegible Next"]));
  });
}
