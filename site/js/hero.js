// @ts-check
/**
 * The site's only script. The page is complete without it; it improves the hero art twice over:
 *
 * - It sizes the art at a whole number of device pixels per art pixel, covering its box. CSS alone
 *   scales by fractions, which leaves some art pixels a device pixel wider than others.
 * - Unless the visitor prefers reduced motion, it animates the scene on a canvas laid over the
 *   still image, at a pixel art frame rate: the wings beat, the bee flies one loop of its
 *   figure-eight and the stars twinkle. It starts from the very frame the still shows, pauses off
 *   screen, and after one loop rests on that frame again: motion that starts by itself stops
 *   within five seconds (WCAG 2.2.2), so the page needs no pause button.
 *
 * `data-motion` on the hero box tells its state: "still", "playing" or "paused".
 */
import { beeAt, trailAt } from "./flight.js";
import { HERO } from "./hero-data.js";

const box = document.querySelector("[data-hero]");
const still = box?.querySelector("img");
if (box instanceof HTMLElement && still instanceof HTMLImageElement) start(box, still);

/**
 * @param {HTMLElement} box
 * @param {HTMLImageElement} still
 */
async function start(box, still) {
  /** @type {HTMLElement[]} */
  const layers = [still];
  const place = () => snap(box, layers);
  new ResizeObserver(place).observe(box);
  onPixelRatioChange(place);
  box.dataset.motion = "still";

  let sheets;
  try {
    sheets = await Promise.all([load(HERO.background.src), load(HERO.bee.src)]);
  } catch {
    return; // The still image stays, already snapped.
  }
  const [background, bee] = sheets;
  const canvas = document.createElement("canvas");
  canvas.width = HERO.width;
  canvas.height = HERO.height;
  canvas.className = "hero-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let raf = 0;
  let elapsed = 0; // seconds of animation played, kept across pauses
  let resumedAt = 0;
  let lastFrame = -1;
  let onScreen = true;
  let done = false;

  /** @param {number} t seconds since the still frame's time */
  const draw = (t) => {
    const time = HERO.stillTime + t;
    const n = Math.round(time * HERO.fps);
    if (n === lastFrame) return;
    lastFrame = n;
    paint(ctx, background, bee, n);
  };
  /** @param {number} now */
  const tick = (now) => {
    const t = elapsed + (now - resumedAt) / 1000;
    if (t >= HERO.flight.period) {
      // One loop flown: back to the still frame, for good.
      raf = 0;
      done = true;
      draw(0);
      box.dataset.motion = "still";
      return;
    }
    raf = requestAnimationFrame(tick);
    draw(t);
  };
  const play = () => {
    if (raf || done || !onScreen || reduce.matches) return;
    resumedAt = performance.now();
    raf = requestAnimationFrame(tick);
    box.dataset.motion = "playing";
  };
  const pause = (/** @type {"paused" | "still"} */ state) => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      elapsed += (performance.now() - resumedAt) / 1000;
    }
    if (!done) box.dataset.motion = state;
  };

  reduce.addEventListener("change", () => {
    canvas.hidden = reduce.matches;
    if (reduce.matches) pause("still");
    else if (!onScreen) pause("paused");
    else play();
  });
  new IntersectionObserver((entries) => {
    // Several changes may queue before a callback: the last one is the current state.
    onScreen = entries[entries.length - 1].isIntersecting;
    if (reduce.matches || done) return;
    if (onScreen) play();
    else pause("paused");
  }).observe(box);

  draw(0); // the still frame: swapping the image for the canvas changes no pixel
  canvas.hidden = reduce.matches;
  box.append(canvas);
  layers.push(canvas);
  place();
  play();
}

/**
 * Draws frame n of the scene: the twinkle frame of the background, then the trail, then the bee.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} background frames stacked vertically
 * @param {HTMLImageElement} bee frames side by side, facing right
 * @param {number} n frame number, at HERO.fps
 */
function paint(ctx, background, bee, n) {
  const t = n / HERO.fps;
  const { width: w, height: h } = HERO;
  const bg = Math.floor((t * 1000) / HERO.background.frameMs) % HERO.background.frames;
  ctx.drawImage(background, 0, bg * h, w, h, 0, 0, w, h);
  for (const dot of trailAt(HERO.flight, HERO.trail, t)) {
    ctx.fillStyle = dot.color;
    ctx.fillRect(dot.x, dot.y, 1, 1);
  }
  const { x, y, facing } = beeAt(HERO.flight, t);
  const { width: bw, height: bh, frames, anchor } = HERO.bee;
  const sx = (n % frames) * bw;
  const top = y - anchor[1];
  if (facing === 1) {
    ctx.drawImage(bee, sx, 0, bw, bh, x - anchor[0], top, bw, bh);
  } else {
    // Mirrored around the anchor: its column lands on x.
    const left = x - (bw - 1 - anchor[0]);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(bee, sx, 0, bw, bh, -(left + bw), top, bw, bh);
    ctx.restore();
  }
}

/**
 * Sizes the layers so one art pixel spans a whole number of device pixels, the smallest that
 * covers the box, and places the art's focus point where `object-position` would put it, on the
 * device pixel grid.
 * @param {HTMLElement} box
 * @param {HTMLElement[]} layers
 */
function snap(box, layers) {
  const dpr = window.devicePixelRatio || 1;
  const rect = box.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const k = Math.max(1, Math.ceil(Math.max((rect.width * dpr) / HERO.width, (rect.height * dpr) / HERO.height) - 1e-6));
  const w = (HERO.width * k) / dpr;
  const h = (HERO.height * k) / dpr;
  // The box may itself start between two device pixels: align the art to the page's grid.
  const left = rect.left + window.scrollX;
  const top = rect.top + window.scrollY;
  const x = Math.round((left + (rect.width - w) * HERO.focus[0]) * dpr) / dpr - left;
  const y = Math.round((top + (rect.height - h) * HERO.focus[1]) * dpr) / dpr - top;
  for (const layer of layers) {
    layer.style.width = `${w}px`;
    layer.style.height = `${h}px`;
    layer.style.transform = `translate(${x}px, ${y}px)`;
  }
  box.classList.add("is-snapped");
}

/**
 * Calls back when the device pixel ratio changes (browser zoom, or a window moved to another
 * screen), which resizes nothing a ResizeObserver would see.
 * @param {() => void} callback
 */
function onPixelRatioChange(callback) {
  const query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  query.addEventListener(
    "change",
    () => {
      callback();
      onPixelRatioChange(callback);
    },
    { once: true },
  );
}

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
async function load(src) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}
