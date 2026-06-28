import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { SignatureProject } from "./types";
import { cardDimensions, renderCardFrame } from "./cardRenderer";
import type { RenderImages } from "./renderer";

export interface CardGifResult {
  dataUrl: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  bytes: number;
  frames: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Bake the ENTIRE animated card (logo + text + photo) into one looping GIF.
export async function exportCardGif(
  project: SignatureProject,
  images: RenderImages,
  opts: { scale?: number; onProgress?: (frac: number) => void } = {}
): Promise<CardGifResult> {
  const scale = opts.scale ?? 1.5;
  const base = cardDimensions(project.content, project.animationOpts.skew);
  const w = Math.round(base.w * scale);
  const h = Math.round(base.h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire 2D context");

  const fps = Math.min(20, project.export.fps);
  const duration = project.animationOpts.durationMs;
  const animFrames = Math.max(2, Math.round((duration / 1000) * fps));
  const holdFrames = Math.max(0, Math.round((project.export.holdMs / 1000) * fps));
  const totalFrames = animFrames + holdFrames;
  const frameDelay = Math.round(1000 / fps);
  const maxColors = Math.max(
    48,
    Math.min(256, Math.round(256 - project.export.quality * 6))
  );

  const model = {
    content: project.content,
    images,
    animationOpts: project.animationOpts,
    animationId: project.animationId,
  };

  const gif = GIFEncoder();
  for (let i = 0; i < totalFrames; i++) {
    const revealT = i < animFrames ? i / (animFrames - 1) : 1;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    renderCardFrame(ctx, model, revealT);

    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, maxColors);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, {
      palette,
      delay: frameDelay,
      repeat: project.export.loop ? 0 : -1,
    });
    opts.onProgress?.((i + 1) / totalFrames);
    if (i % 3 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  gif.finish();
  const raw = gif.bytes();
  const buf = new Uint8Array(raw.length);
  buf.set(raw);
  const blob = new Blob([buf], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const dataUrl = `data:image/gif;base64,${bytesToBase64(buf)}`;

  return { dataUrl, blob, url, width: w, height: h, bytes: buf.length, frames: totalFrames };
}
