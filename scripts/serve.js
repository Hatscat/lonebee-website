// @ts-check
/**
 * Serves site/ the way GitHub Pages does, so the tests see what visitors will see: "/dir/" serves
 * its index.html, "/dir" redirects to "/dir/", "/page" serves page.html, and any other missing
 * path answers 404 with the body of 404.html. Nothing is cached: a reload shows the files on disk.
 *
 * PORT and HOST come from the environment (4300 and 127.0.0.1 by default).
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../site/", import.meta.url)));
const PORT = Number(process.env.PORT ?? 4300);
const HOST = process.env.HOST ?? "127.0.0.1";

/** The media types GitHub Pages sends for the extensions the site uses. */
/** @type {Record<string, string>} */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/vnd.microsoft.icon",
  ".woff2": "font/woff2",
};

/**
 * @param {string} path
 * @returns {Promise<import("node:fs").Stats | null>}
 */
async function statOrNull(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {number} status
 * @param {string} file
 */
async function sendFile(req, res, status, file) {
  const info = await statOrNull(file);
  if (!info?.isFile()) {
    res.writeHead(status, { "Content-Type": TYPES[".txt"], "Cache-Control": "no-store" });
    res.end(status === 404 ? "Not found\n" : "\n");
    return;
  }
  res.writeHead(status, {
    "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": "no-store",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
}

/**
 * Maps a URL path to the file GitHub Pages would serve, a redirect, or nothing (404).
 * @param {string} pathname decoded, starting with "/"
 * @returns {Promise<{ file: string } | { redirect: string } | null>}
 */
async function route(pathname) {
  const target = resolve(ROOT, `.${pathname}`);
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  const info = await statOrNull(target);
  if (info?.isDirectory()) {
    if (!pathname.endsWith("/")) return { redirect: `${pathname}/` };
    const index = join(target, "index.html");
    return (await statOrNull(index))?.isFile() ? { file: index } : null;
  }
  if (info?.isFile()) return { file: target };
  if (!pathname.endsWith("/") && (await statOrNull(`${target}.html`))?.isFile()) {
    return { file: `${target}.html` };
  }
  return null;
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": TYPES[".txt"] });
    res.end("Method not allowed\n");
    return;
  }
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = "";
  }
  const found = pathname.startsWith("/") && !pathname.includes("\0") ? await route(pathname) : null;
  if (found && "redirect" in found) {
    res.writeHead(301, { Location: `${encodeURI(found.redirect)}${url.search}` });
    res.end();
  } else if (found) {
    await sendFile(req, res, 200, found.file);
  } else {
    await sendFile(req, res, 404, join(ROOT, "404.html"));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Serving site/ at http://${HOST}:${PORT}/`);
});
