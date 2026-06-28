import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { SignatureProject } from "./types";
import { getLayout } from "./layouts";
import { getAnimation } from "./animations";
import { renderFrame, type RenderImages } from "./renderer";

export interface ExportResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  bytes: number;
  frames: number;
}

// Render the full animation to a looping GIF in the browser.
export async function exportGif(
  project: SignatureProject,
  images: RenderImages,
  onProgress?: (frac: number) => void
): Promise<ExportResult> {
  const layout = getLayout(project.layoutId);
  const animation = getAnimation(project.animationId);
  const { fps, scale, holdMs, quality } = project.export;

  const w = Math.round(layout.canvas.w * scale);
  const h = Math.round(layout.canvas.h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire 2D context");
  ctx.scale(scale, scale);

  const duration = project.animationOpts.durationMs;
  const animFrames = Math.max(2, Math.round((duration / 1000) * fps));
  const holdFrames = Math.max(0, Math.round((holdMs / 1000) * fps));
  const totalFrames = animFrames + holdFrames;
  const frameDelay = Math.round(1000 / fps);

  const gif = GIFEncoder();
  // gifenc quantize: lower maxColors => smaller file. Map quality 1..30 -> colors.
  const maxColors = Math.max(32, Math.min(256, Math.round(256 - quality * 6)));

  for (let i = 0; i < totalFrames; i++) {
    const t = i < animFrames ? i / (animFrames - 1) : 1;
    renderFrame(ctx, {
      content: project.content,
      layout,
      animation,
      animationOpts: project.animationOpts,
      images,
      t,
    });

    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, maxColors);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, {
      palette,
      delay: frameDelay,
      repeat: project.export.loop ? 0 : -1,
    });

    onProgress?.((i + 1) / totalFrames);
    // Yield so the UI thread can paint the progress bar.
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  gif.finish();
  const bytes = gif.bytes();
  // Copy into a plain ArrayBuffer-backed view so Blob accepts it under strict TS.
  const buf = new Uint8Array(bytes.length);
  buf.set(bytes);
  const blob = new Blob([buf], { type: "image/gif" });
  const url = URL.createObjectURL(blob);

  return { blob, url, width: w, height: h, bytes: buf.length, frames: totalFrames };
}
