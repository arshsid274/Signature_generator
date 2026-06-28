import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { SignatureProject } from "./types";
import { getLayout } from "./layouts";
import { getAnimation } from "./animations";
import { renderPhotoFrame, regionOf } from "./renderer";

export interface PhotoGifResult {
  dataUrl: string; // base64 data: URL — embeds straight into the email HTML
  blob: Blob;
  url: string; // object URL for download
  width: number;
  height: number;
  bytes: number;
  frames: number;
}

function isDark(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Render ONLY the photo region, animated, into a compact looping GIF.
// `targetHeight` controls the output resolution (default keeps email files small).
export async function exportPhotoGif(
  project: SignatureProject,
  image: CanvasImageSource,
  opts: { targetHeight?: number; onProgress?: (frac: number) => void } = {}
): Promise<PhotoGifResult> {
  const layout = getLayout(project.layoutId);
  const animation = getAnimation(project.animationId);
  const photoZone = layout.zones.find((z) => z.id === "photo");
  if (!photoZone) throw new Error("This layout has no photo zone.");

  const zoneRegion = regionOf(photoZone, layout);
  const aspect = zoneRegion.w / zoneRegion.h || 0.75;

  const h = Math.round(opts.targetHeight ?? 220);
  const w = Math.round(h * aspect);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire 2D context");

  // Keep email files small: cap fps and color count.
  const fps = Math.min(20, project.export.fps);
  const duration = project.animationOpts.durationMs;
  const animFrames = Math.max(2, Math.round((duration / 1000) * fps));
  const holdFrames = Math.max(
    0,
    Math.round((project.export.holdMs / 1000) * fps)
  );
  const totalFrames = animFrames + holdFrames;
  const frameDelay = Math.round(1000 / fps);
  const background = isDark(layout.background) ? layout.background : "#ffffff";
  const maxColors = Math.max(
    32,
    Math.min(256, Math.round(256 - project.export.quality * 6))
  );

  const gif = GIFEncoder();

  for (let i = 0; i < totalFrames; i++) {
    const t = i < animFrames ? i / (animFrames - 1) : 1;
    renderPhotoFrame(ctx, {
      image,
      photoStyle: layout.photoStyle,
      animation,
      animationOpts: project.animationOpts,
      width: w,
      height: h,
      t,
      background,
    });
    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, maxColors);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, {
      palette,
      delay: frameDelay,
      repeat: project.export.loop ? 0 : -1,
    });
    opts.onProgress?.((i + 1) / totalFrames);
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  gif.finish();
  const raw = gif.bytes();
  const buf = new Uint8Array(raw.length);
  buf.set(raw);
  const blob = new Blob([buf], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const dataUrl = `data:image/gif;base64,${bytesToBase64(buf)}`;

  return {
    dataUrl,
    blob,
    url,
    width: w,
    height: h,
    bytes: buf.length,
    frames: totalFrames,
  };
}
