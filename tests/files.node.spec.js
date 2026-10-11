// @ts-check
/**
 * What GitHub Pages will serve, checked on disk: every local URL the site references exists, and
 * every file it ships is referenced from somewhere (or is one browsers and crawlers ask for by
 * name), so nothing stale is deployed.
 */
import { expect, test } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("../site/", import.meta.url));
const ORIGIN = "https://lonebee.games";

/** Files requested by convention rather than by a link. */
const BY_NAME = new Set(["/index.html", "/404.html", "/robots.txt", "/sitemap.xml", "/favicon.ico", "/apple-touch-icon.png"]);

/** @param {string} dir @returns {Promise<string[]>} site paths, like "/css/site.css" */
async function siteFiles(dir = SITE) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? siteFiles(join(dir, e.name)) : [`/${relative(SITE, join(dir, e.name)).split("\\").join("/")}`])),
  );
  return nested.flat();
}

/**
 * Local references in one file, resolved to site paths.
 * @param {string} path site path of the referencing file
 * @param {string} text its content
 */
function references(path, text) {
  /** @type {string[]} */
  const urls = [];
  if (path.endsWith(".html")) {
    for (const m of text.matchAll(/\s(?:href|src|content|poster|data-[a-z-]+)="([^"]+)"/g)) urls.push(m[1]);
    for (const m of text.matchAll(/\ssrcset="([^"]+)"/g)) urls.push(...m[1].split(",").map((s) => s.trim().split(/\s+/)[0]));
    // JSON-LD and other data blocks.
    for (const m of text.matchAll(/"(https:\/\/lonebee\.games\/[^"]*)"/g)) urls.push(m[1]);
  }
  if (path.endsWith(".css")) for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) urls.push(m[1]);
  if (path.endsWith(".js")) {
    for (const m of text.matchAll(/(?:import|from)\s*["']([^"']+)["']/g)) urls.push(m[1]);
    for (const m of text.matchAll(/["'](\/[a-z0-9/_.-]+\.(?:png|svg|webp|js|json|woff2))["']/gi)) urls.push(m[1]);
  }
  if (path.endsWith(".webmanifest")) {
    const manifest = JSON.parse(text);
    for (const icon of manifest.icons ?? []) urls.push(icon.src);
    if (manifest.start_url) urls.push(manifest.start_url);
  }
  if (path.endsWith(".xml") || path.endsWith(".txt")) for (const m of text.matchAll(/https:\/\/lonebee\.games\/[^\s<]*/g)) urls.push(m[0]);
  return urls
    .filter((u) => u.startsWith("/") || u.startsWith("./") || u.startsWith("../") || u.startsWith(`${ORIGIN}/`) || /^[a-z0-9_-]+\.[a-z0-9]+$/i.test(u))
    .filter((u) => !u.startsWith("//"))
    .map((u) => {
      const local = u.startsWith(ORIGIN) ? u.slice(ORIGIN.length) : u;
      const clean = local.split(/[?#]/)[0];
      const resolved = clean.startsWith("/") ? clean : posix.join(posix.dirname(path), clean);
      return resolved.endsWith("/") ? `${resolved}index.html` : resolved;
    });
}

test("every local reference exists, and every file is referenced", async () => {
  const files = await siteFiles();
  const present = new Set(files);
  /** @type {Map<string, Set<string>>} referenced path → referencing files */
  const referenced = new Map();
  for (const file of files) {
    if (!/\.(html|css|js|webmanifest|xml|txt)$/.test(file)) continue;
    const text = await readFile(join(SITE, file), "utf8");
    for (const ref of references(file, text)) {
      if (!referenced.has(ref)) referenced.set(ref, new Set());
      /** @type {Set<string>} */ (referenced.get(ref)).add(file);
    }
  }
  const missing = [...referenced].filter(([ref]) => !present.has(ref)).map(([ref, by]) => `${ref} (from ${[...by].join(", ")})`);
  expect(missing, "referenced but missing").toEqual([]);
  // The SIL Open Font License travels with the fonts it covers, unlinked.
  const LICENSES = /^\/fonts\/[a-z0-9-]+-OFL\.txt$/;
  const orphans = files.filter((f) => !referenced.has(f) && !BY_NAME.has(f) && !LICENSES.test(f));
  expect(orphans, "shipped but never referenced").toEqual([]);
});

test("every font ships with its license", async () => {
  const files = await siteFiles();
  const fonts = files.filter((f) => f.endsWith(".woff2"));
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) expect(files, font).toContain(font.replace(/\.woff2$/, "-OFL.txt"));
});

/**
 * The policy every page carries: the site's own files only, no inline script or style; and Umami's
 * tracker and endpoint, the one exception (js/analytics.js).
 */
const CSP =
  "default-src 'none'; script-src 'self' https://cloud.umami.is; connect-src https://gateway.umami.is; style-src 'self'; img-src 'self'; font-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'";

test("every page carries the Content-Security-Policy, before any resource", async () => {
  const pages = (await siteFiles()).filter((f) => f.endsWith(".html"));
  expect(pages.length).toBeGreaterThan(0);
  for (const page of pages) {
    const html = await readFile(join(SITE, page), "utf8");
    const metas = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g)];
    expect(metas.map((m) => m[1]), page).toEqual([CSP]);
    const first = Math.min(...["<link", "<script", "<style"].map((tag) => html.indexOf(tag)).filter((i) => i >= 0));
    expect(/** @type {number} */ (metas[0].index), `${page}: the policy comes first`).toBeLessThan(first);
  }
});
