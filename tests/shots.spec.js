// @ts-check
/**
 * Screenshots for a human review (npm run shots), into test-results/shots/. Not a regression test:
 * nothing is compared, and the files are not committed.
 */
import { test } from "@playwright/test";

const SIZES = [
  { name: "phone", width: 390, height: 844, scale: 3 },
  { name: "tablet", width: 820, height: 1180, scale: 2 },
  { name: "laptop", width: 1440, height: 900, scale: 1 },
  { name: "wide", width: 1920, height: 1080, scale: 1 },
];

for (const size of SIZES) {
  for (const [page, path] of [["home", "/"], ["404", "/no/such/page"]]) {
    test(`${page} at ${size.name}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale });
      const tab = await context.newPage();
      await tab.goto(path);
      await tab.waitForLoadState("networkidle");
      await tab.evaluate(() => document.fonts.ready);
      await tab.screenshot({ path: `test-results/shots/${page}-${size.name}-fold.png` });
      await tab.locator("img[loading=lazy]").evaluateAll((imgs) => imgs.forEach((i) => ((/** @type {HTMLImageElement} */ (i)).loading = "eager")));
      await tab.waitForLoadState("networkidle");
      await tab.screenshot({ path: `test-results/shots/${page}-${size.name}-full.png`, fullPage: true });
      await context.close();
    });
  }
}
