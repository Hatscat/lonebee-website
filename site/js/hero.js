// @ts-check
/**
 * The hero's script. The page is complete without it; it improves the hero art three ways:
 *
 * - It sizes the art at a whole number of device pixels per art pixel, pinned to the bottom right
 *   corner of its box like the CSS fallback: a box of another shape crops the art's left or top,
 *   never its meadow or its light. CSS alone scales by fractions, which leaves some art pixels a
 *   device pixel wider than others.
 * - Unless the visitor prefers reduced motion, it animates the scene on a canvas laid over the
 *   still image, at a pixel art frame rate: the wings beat, the bee flies one loop of its
 *   figure-eight and the stars twinkle. It starts from the very frame the still shows, pauses
 *   while the bee is out of view or the tab hidden, and after one loop rests on that frame again:
 *   motion that starts by itself stops within five seconds (WCAG 2.2.2), so the page needs no
 *   pause button.
 * - A click on the art plays one more loop, and so does a Replay button for the keyboard, which
 *   shows only when focused. Motion the visitor starts lasts six seconds at most.
 *
 * `data-motion` on the hero box tells its state: "still", "playing" or "paused".
 */
import { beeAt, trailAt } from "./flight.js";
import { HERO } from "./hero-data.js";

/**
 * The most rows of night, in art pixels, that the art may leave above itself when the scale that
 * covers its box would crop more than its night (see snap): the header's night, that band and the
 * art's own night rows read as one sky.
 */
const GAP = 30;

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
  /** @type {HTMLElement | null} laid over the bee once the animation is set up */
  let spot = null;
  const place = () => snap(box, layers, spot);
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
  const period = HERO.flight.period;
  let raf = 0;
  let elapsed = 0; // seconds of animation played, kept across pauses
  let resumedAt = 0;
  let end = period; // when to come to rest: the end of a loop, where the still frame comes back
  let lastFrame = -1;
  let onScreen = false; // until the observer below has seen the bee
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
    if (t >= end) {
      // The last loop is flown: back to the still frame, until the visitor asks for another.
      raf = 0;
      done = true;
      elapsed = end;
      draw(end);
      box.dataset.motion = "still";
      return;
    }
    raf = requestAnimationFrame(tick);
    draw(t);
  };
  const play = () => {
    if (raf || done || !onScreen || document.hidden || reduce.matches) return;
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
  /**
   * One more loop, from where the bee is: the loop is periodic and ends on the still frame, so it
   * plays on without a jump. Half a loop or more still to fly is answer enough, so a double click
   * or a held key never stacks loops.
   */
  const replay = () => {
    if (reduce.matches) return;
    const t = Math.min(end, raf ? elapsed + (performance.now() - resumedAt) / 1000 : elapsed);
    if (end - t >= period / 2) return;
    done = false;
    end += period;
    play();
    if (!raf) box.dataset.motion = "paused"; // it plays once the bee is back in view
  };

  reduce.addEventListener("change", () => {
    canvas.hidden = reduce.matches;
    if (reduce.matches) pause("still");
    else if (!onScreen) pause("paused");
    else play();
  });
  // On screen means the bee, half of it at least, is: a loop flown with only a strip of meadow in
  // view would be lost to the visitor.
  spot = document.createElement("div");
  spot.className = "hero-bee";
  spot.setAttribute("aria-hidden", "true");
  box.append(spot);
  place();
  new IntersectionObserver(
    (entries) => {
      // Several changes may queue before a callback: the last one is the current state.
      onScreen = entries[entries.length - 1].intersectionRatio >= 0.5;
      if (reduce.matches || done) return;
      if (onScreen) play();
      else pause("paused");
    },
    { threshold: [0, 0.5, 1] },
  ).observe(spot);
  // A hidden tab gets no frames while the clock runs on: pause, so no part of a loop is lost.
  document.addEventListener("visibilitychange", () => {
    if (reduce.matches || done) return;
    if (document.hidden) pause("paused");
    else play();
  });

  // A click on the art, anywhere the copy leaves it uncovered. The listener sits on the document,
  // so no element of the hero reads as clickable to assistive technology: the button below is
  // the accessible way. Text, controls and the space between the buttons (a near miss) keep their
  // own clicks. A press that selected text, or dragged across some, ends in a click too: it is no
  // click on the art, while a selection made before, elsewhere on the page, changes nothing.
  const hero = box.parentElement ?? box;
  let press = { x: 0, y: 0, text: "" };
  document.addEventListener("pointerdown", (event) => (press = { x: event.clientX, y: event.clientY, text: String(document.getSelection() ?? "") }), true);
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !hero.contains(target)) return;
    if (target.closest("a, button, .hero-title, .hero-tagline, .actions")) return;
    const r = box.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) return;
    const selection = document.getSelection();
    const dragged = Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4;
    if (selection && !selection.isCollapsed && (String(selection) !== press.text || dragged)) return;
    replay();
  });
  // For the keyboard: a real button after the copy's buttons, out of sight until it has focus
  // (site.css). Reaching it may have scrolled the bee out of view: bring the bee back to watch.
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button hero-replay";
  button.textContent = "Replay";
  button.setAttribute("aria-label", "Replay the animation");
  button.addEventListener("click", () => {
    replay();
    if (!onScreen) spot?.scrollIntoView({ block: "nearest" });
  });
  // Browsers scroll a focused control into view, not its ring or its drop, and Firefox leaves a
  // half-shown one where it is: show the whole of it (its scroll margin holds the ring).
  button.addEventListener("focus", () => button.scrollIntoView({ block: "nearest" }));
  (hero.querySelector(".hero-copy") ?? hero).append(button);

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
 * Sizes the layers so one art pixel spans a whole number of device pixels, and pins the art to the
 * bottom right corner of the box on the device pixel grid. The scale is the smallest that covers
 * the box, unless that crops more than the art's night off its top while a step smaller still
 * spans the width: then the art leaves a band of night above it instead, at most GAP rows, which
 * the box's own night background fills. The spot, if any, goes over the bee.
 * @param {HTMLElement} box
 * @param {HTMLElement[]} layers
 * @param {HTMLElement | null} spot
 */
function snap(box, layers, spot) {
  const dpr = window.devicePixelRatio || 1;
  const rect = box.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  // The box's edges in device pixels from the page's origin. The tolerance absorbs inexact
  // ratios: Chromium reports 110% zoom as 1.100000023841858.
  const pageLeft = rect.left + window.scrollX;
  const pageTop = rect.top + window.scrollY;
  const left = Math.floor(pageLeft * dpr + 1e-3);
  const top = Math.floor(pageTop * dpr + 1e-3);
  const right = Math.ceil((pageLeft + rect.width) * dpr - 1e-3);
  const bottom = Math.ceil((pageTop + rect.height) * dpr - 1e-3);
  const [w, h] = [right - left, bottom - top];
  let k = Math.max(1, Math.ceil(Math.max(w / HERO.width, h / HERO.height) - 1e-6));
  if (k > 1 && HERO.height - h / k > HERO.night && (k - 1) * HERO.width >= w && h / (k - 1) - HERO.height <= GAP) k -= 1;
  const [artWidth, artHeight] = [HERO.width * k, HERO.height * k];
  const [x, y] = [(right - artWidth) / dpr - pageLeft, (bottom - artHeight) / dpr - pageTop];
  for (const layer of layers) {
    layer.style.width = `${artWidth / dpr}px`;
    layer.style.height = `${artHeight / dpr}px`;
    layer.style.transform = `translate(${x}px, ${y}px)`;
  }
  if (spot) {
    const [x0, y0, x1, y1] = HERO.bee.box;
    const size = k / dpr;
    spot.style.width = `${(x1 - x0 + 1) * size}px`;
    spot.style.height = `${(y1 - y0 + 1) * size}px`;
    spot.style.transform = `translate(${x + x0 * size}px, ${y + y0 * size}px)`;
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
