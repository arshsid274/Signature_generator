// ── Pixel-exact diagonal slice-reveal (ported from the standalone index.html) ──
// Segments the embedded silhouette mask into 6 strips (connected components) and
// animates each with a clip-path-style grow + fade + a shared down→up parallax,
// reproducing the GSAP timeline exactly:
//   • slides 1–4 grow from the BOTTOM edge upward, 5–6 from the TOP edge down
//   • durations are progressive: d[n] = d[n-1] × 1.4   (S1 fastest)
//   • each slide starts at the previous slide's 70% (S2–4) / 50% (S5–6) progress
//   • ease: power3.out;  photo drifts up 10% over the first 70% of the timeline
// One shared canvas renderer drives BOTH the live preview and the GIF export, so
// what you see is exactly what is exported.
import { loadImage } from "./imageUtils";
import { MASK_SIL, SLICE_VIEWBOX, SLICE_SILBBOX } from "./sliceSil";
import type { AnimationOpts, Region } from "./types";

export interface SliceStrip {
  n: number; // slide number 1–6
  dir: "up" | "down";
  bx: number; // strip bbox in viewBox coords
  by: number;
  bw: number;
  bh: number;
  mask: HTMLCanvasElement; // bw×bh alpha (opaque where this strip's silhouette is)
  ST: number; // normalized start (0–1) on the master timeline
  D: number; // normalized duration (0–1)
}

export interface SliceModel {
  sb: { x: number; y: number; w: number; h: number }; // silhouette bbox (viewBox px)
  vb: { w: number; h: number };
  strips: SliceStrip[];
  parallaxEnd: number; // fraction of timeline the photo finishes rising by
  driftFrac: number; // parallax distance as fraction of sb.h
}

const MAPPING = [5, 4, 1, 2, 3, 6]; // left→right strip → slide number (confirmed)

let _model: SliceModel | null = null;
let _pending: Promise<SliceModel> | null = null;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

async function build(): Promise<SliceModel> {
  const img = await loadImage(MASK_SIL);
  const w = SLICE_VIEWBOX.w;
  const h = SLICE_VIEWBOX.h;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  if (!cx) throw new Error("Could not acquire 2D context for mask");
  cx.drawImage(img, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;

  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0;

  // 8-connectivity connected components
  const lbl = new Int32Array(w * h).fill(-1);
  let nc = 0;
  const comps: { id: number; area: number; cx: number; bx: number; by: number; bw: number; bh: number }[] = [];
  const stk: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (m[i] && lbl[i] < 0) {
      const id = nc++;
      let area = 0, sx = 0, minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
      stk.length = 0;
      stk.push(i);
      lbl[i] = id;
      while (stk.length) {
        const p = stk.pop()!;
        const x = p % w, y = (p / w) | 0;
        area++; sx += x;
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
            const q = Y * w + X;
            if (m[q] && lbl[q] < 0) {
              lbl[q] = id;
              stk.push(q);
            }
          }
      }
      comps.push({ id, area, cx: sx / area, bx: minx, by: miny, bw: maxx - minx + 1, bh: maxy - miny + 1 });
    }
  }
  const big = comps.filter((c) => c.area > 1500).sort((a, b) => a.cx - b.cx);

  // Master timeline (normalized). base = 1; d[n] = d[n-1]×1.4; staggered by
  // the previous slide's 70% (S2–4) / 50% (S5–6) progress.
  const dur = [0, 1, 1.4, 1.96, 2.744, 3.8416, 5.37824];
  const st = [0, 0, 0, 0, 0, 0, 0];
  st[2] = st[1] + 0.7 * dur[1];
  st[3] = st[2] + 0.7 * dur[2];
  st[4] = st[3] + 0.7 * dur[3];
  st[5] = st[4] + 0.5 * dur[4];
  st[6] = st[5] + 0.5 * dur[5];
  let total = 0;
  for (let n = 1; n <= 6; n++) total = Math.max(total, st[n] + dur[n]);

  const strips: SliceStrip[] = [];
  big.forEach((comp, i) => {
    const n = MAPPING[i] ?? i + 1;
    const mc = document.createElement("canvas");
    mc.width = comp.bw;
    mc.height = comp.bh;
    const mx = mc.getContext("2d")!;
    const im = mx.createImageData(comp.bw, comp.bh);
    const a = im.data;
    for (let yy = 0; yy < comp.bh; yy++)
      for (let xx = 0; xx < comp.bw; xx++) {
        if (lbl[(comp.by + yy) * w + (comp.bx + xx)] === comp.id) {
          const o = (yy * comp.bw + xx) * 4;
          a[o] = a[o + 1] = a[o + 2] = a[o + 3] = 255;
        }
      }
    mx.putImageData(im, 0, 0);
    strips.push({
      n,
      dir: n <= 4 ? "up" : "down",
      bx: comp.bx,
      by: comp.by,
      bw: comp.bw,
      bh: comp.bh,
      mask: mc,
      ST: st[n] / total,
      D: dur[n] / total,
    });
  });

  _model = {
    sb: { ...SLICE_SILBBOX },
    vb: { ...SLICE_VIEWBOX },
    strips,
    parallaxEnd: 0.7,
    driftFrac: 0.1,
  };
  return _model;
}

// Kick off (or reuse) the async mask segmentation. Await before exporting frames.
export function ensureSliceModel(): Promise<SliceModel> {
  if (_model) return Promise.resolve(_model);
  if (!_pending) _pending = build();
  return _pending;
}

export function getSliceModel(): SliceModel | null {
  return _model;
}

export function sliceAspect(): number {
  const sb = _model?.sb ?? SLICE_SILBBOX;
  return sb.w / sb.h;
}

// Reusable scratch canvases at silhouette resolution (created once).
let _frame: HTMLCanvasElement | null = null;
let _tmp: HTMLCanvasElement | null = null;
function scratch(w: number, h: number) {
  if (!_frame || _frame.width !== w || _frame.height !== h) {
    _frame = document.createElement("canvas");
    _frame.width = w;
    _frame.height = h;
    _tmp = document.createElement("canvas");
    _tmp.width = w;
    _tmp.height = h;
  }
  return { frame: _frame!, tmp: _tmp! };
}

function srcSize(image: CanvasImageSource): { w: number; h: number } {
  const a = image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  const w = a.naturalWidth || (typeof a.width === "number" ? a.width : 0) || 1;
  const h = a.naturalHeight || (typeof a.height === "number" ? a.height : 0) || 1;
  return { w, h };
}

// Draw the slice-reveal at progress t (0→1) into `region`. The un-revealed area
// is left untouched (the caller fills the background first).
export function renderSlice(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  region: Region,
  t: number,
  opts: AnimationOpts
): void {
  const model = _model;
  if (!model) return; // not segmented yet — caller shows background/placeholder
  const sb = model.sb;
  const { frame, tmp } = scratch(Math.round(sb.w), Math.round(sb.h));
  const fctx = frame.getContext("2d")!;
  const tctx = tmp.getContext("2d")!;
  fctx.clearRect(0, 0, frame.width, frame.height);

  // Photo placement in silhouette-local px: cover + zoom + move + parallax.
  const zoom = opts.zoom && opts.zoom > 0 ? opts.zoom : 1;
  const offX = opts.offsetX ?? 0;
  const offY = opts.offsetY ?? 0;
  const { w: iw, h: ih } = srcSize(image);
  const sc = Math.max(sb.w / iw, sb.h / ih) * zoom;
  const dw = iw * sc;
  const dh = ih * sc;
  const pf = clamp01(t / model.parallaxEnd); // linear; finishes by parallaxEnd
  const yOff = (1 - pf) * sb.h * model.driftFrac; // starts +drift → 0 (down→up)
  const dx = sb.w / 2 - dw / 2 + offX;
  const dy = sb.h / 2 - dh / 2 + offY + yOff;

  for (const s of model.strips) {
    const lp = clamp01((t - s.ST) / Math.max(1e-4, s.D));
    const p = easeOutCubic(lp);
    if (p <= 0.0001) continue;

    const bx = s.bx - sb.x;
    const by = s.by - sb.y;
    // clip rect (silhouette-local) grows from the strip's edge
    const ry = s.dir === "up" ? by + (1 - p) * s.bh : by;
    const rh = p * s.bh;

    tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.save();
    tctx.beginPath();
    tctx.rect(bx, ry, s.bw, rh);
    tctx.clip();
    tctx.drawImage(image, dx, dy, dw, dh);
    tctx.restore();
    // mask the drawn photo to this strip's exact silhouette shape
    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(s.mask, bx, by);
    tctx.globalCompositeOperation = "source-over";

    fctx.globalAlpha = p; // fade in
    fctx.drawImage(tmp, 0, 0);
    fctx.globalAlpha = 1;
  }

  // Fit the silhouette-aspect frame into `region` WITHOUT distortion (letterbox).
  // For the photo-only GIF the region already matches the silhouette aspect, so
  // this fills it exactly; for card/full-layout regions it centers undistorted.
  const fs = Math.min(region.w / frame.width, region.h / frame.height);
  const fdw = frame.width * fs;
  const fdh = frame.height * fs;
  const fdx = region.x + (region.w - fdw) / 2;
  const fdy = region.y + (region.h - fdh) / 2;
  ctx.drawImage(frame, 0, 0, frame.width, frame.height, fdx, fdy, fdw, fdh);
}
