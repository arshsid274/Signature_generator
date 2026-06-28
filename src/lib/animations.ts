import type { AnimationDef, AnimationOpts, Region } from "./types";
import { computeCover } from "./imageUtils";
import { renderSlice } from "./sliceReveal";

// ── easing ─────────────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  r: Region
) {
  const c = computeCover(image, r);
  ctx.drawImage(image, c.sx, c.sy, c.sw, c.sh, c.dx, c.dy, c.dw, c.dh);
}

// ── Diagonal strips (the reference look) ─────────────────────────────────────
// Slice the photo into N parallelogram strips. Each starts offset + transparent
// and eases into place on a staggered delay, leaving thin gaps between slices.
function diagonalStrips(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  region: Region,
  t: number,
  opts: AnimationOpts
) {
  const n = Math.max(2, Math.round(opts.strips));
  const stagger = clamp01(opts.stagger);
  const skew = Math.tan((opts.skew * Math.PI) / 180) * region.h;
  const gap = Math.max(1, region.w * 0.006); // thin white gap between slices
  const stripW = (region.w + Math.abs(skew)) / n;
  // Window so that with stagger each strip still completes by t=1.
  const window = 1 - stagger * (1 - 1 / n);

  for (let i = 0; i < n; i++) {
    const delay = stagger * (i / n);
    const local = easeOutCubic(clamp01((t - delay) / Math.max(0.0001, window)));
    if (local <= 0) continue;

    // strip slides up from below into place
    const slideFrom = region.h * 0.6;
    const dy = (1 - local) * slideFrom;

    const x0 = region.x - Math.max(0, skew) + i * stripW;
    // Parallelogram: top edge shifted by skew relative to bottom edge.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0 + skew + gap / 2, region.y);
    ctx.lineTo(x0 + skew + stripW - gap / 2, region.y);
    ctx.lineTo(x0 + stripW - gap / 2, region.y + region.h);
    ctx.lineTo(x0 + gap / 2, region.y + region.h);
    ctx.closePath();
    ctx.clip();

    // Gray placeholder slot — visible until the photo slice fills in.
    ctx.fillStyle = "#e9eaec";
    ctx.fillRect(
      region.x - region.w,
      region.y,
      region.w * 3,
      region.h
    );

    ctx.globalAlpha = local;
    ctx.translate(0, dy);
    drawCover(ctx, image, region);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ── Fade in ──────────────────────────────────────────────────────────────────
function fadeIn(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  region: Region,
  t: number
) {
  ctx.save();
  ctx.globalAlpha = easeOutCubic(clamp01(t));
  drawCover(ctx, image, region);
  ctx.restore();
}

// ── Slide in (from the right edge) ───────────────────────────────────────────
function slideIn(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  region: Region,
  t: number
) {
  const e = easeOutCubic(clamp01(t));
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.globalAlpha = Math.min(1, e * 1.4);
  ctx.translate((1 - e) * region.w, 0);
  drawCover(ctx, image, region);
  ctx.restore();
}

// ── Wipe (linear left→right reveal) ──────────────────────────────────────────
function wipe(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  region: Region,
  t: number
) {
  const e = easeOutCubic(clamp01(t));
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w * e, region.h);
  ctx.clip();
  drawCover(ctx, image, region);
  ctx.restore();
}

// ── Reveal + settle (scale 1.05 → 1.0 with fade) ─────────────────────────────
function revealSettle(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  region: Region,
  t: number
) {
  const e = easeOutBack(clamp01(t));
  const scale = 1.06 - 0.06 * clamp01(t);
  const cx = region.x + region.w / 2;
  const cy = region.y + region.h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.globalAlpha = clamp01(e);
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawCover(ctx, image, region);
  ctx.restore();
}

export const ANIMATIONS: AnimationDef[] = [
  {
    id: "slice-reveal",
    name: "Slice Reveal",
    durationMs: 2600,
    render: renderSlice,
  },
  {
    id: "diagonal-strips",
    name: "Diagonal Strips",
    durationMs: 1600,
    render: diagonalStrips,
  },
  { id: "fade", name: "Fade In", durationMs: 1200, render: fadeIn },
  { id: "slide", name: "Slide In", durationMs: 1200, render: slideIn },
  { id: "wipe", name: "Wipe", durationMs: 1200, render: wipe },
  {
    id: "reveal-settle",
    name: "Reveal + Settle",
    durationMs: 1400,
    render: revealSettle,
  },
];

export function getAnimation(id: string): AnimationDef {
  return ANIMATIONS.find((a) => a.id === id) ?? ANIMATIONS[0];
}
