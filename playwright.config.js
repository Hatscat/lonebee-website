// @ts-check
import { defineConfig, devices } from "@playwright/test";

const PORT = 4300;
const baseURL = `http://127.0.0.1:${PORT}`;

// The VS Code snap leaks GIO_MODULE_DIR, which makes WebKit's network process load the snap's
// libraries and fail every navigation.
const webkitEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    /** @returns {entry is [string, string]} */
    (entry) => entry[0] !== "GIO_MODULE_DIR" && entry[1] !== undefined,
  ),
);

// Specs named *.node.spec.js check files on disk and never open a browser: they run once, in the
// "node" project. Browser specs run in every other project.
const NODE_SPECS = /\.node\.spec\.js$/;
const SHOTS_SPEC = /shots\.spec\.js$/;
const BROWSER_IGNORE = [NODE_SPECS, SHOTS_SPEC];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "en-US",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve.js",
    url: baseURL,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "node", testMatch: NODE_SPECS },
    // The full Chromium build: the default headless shell rounds glyph widths to whole pixels, so
    // text metrics wouldn't match real devices.
    {
      name: "chromium",
      testIgnore: BROWSER_IGNORE,
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    { name: "firefox", testIgnore: BROWSER_IGNORE, use: { ...devices["Desktop Firefox"] } },
    {
      name: "webkit",
      testIgnore: BROWSER_IGNORE,
      use: { ...devices["Desktop Safari"], launchOptions: { env: webkitEnv } },
    },
    {
      name: "pixel-7",
      testIgnore: BROWSER_IGNORE,
      use: { ...devices["Pixel 7"], channel: "chromium" },
    },
    {
      name: "iphone-14",
      testIgnore: BROWSER_IGNORE,
      use: { ...devices["iPhone 14"], launchOptions: { env: webkitEnv } },
    },
    // Screenshots for a human review, only with SHOTS=1 (npm run shots).
    ...(process.env.SHOTS
      ? [{ name: "shots", testMatch: SHOTS_SPEC, use: { channel: "chromium" } }]
      : []),
  ],
});
