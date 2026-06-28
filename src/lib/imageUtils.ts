import type { Region } from "./types";

export interface CoverParams {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

function srcSize(image: CanvasImageSource): { w: number; h: number } {
  if (image instanceof HTMLImageElement)
    return { w: image.naturalWidth, h: image.naturalHeight };
  if (image instanceof HTMLCanvasElement)
    return { w: image.width, h: image.height };
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap)
    return { w: image.width, h: image.height };
  // Fallback
  const anyImg = image as unknown as { width: number; height: number };
  return { w: anyImg.width, h: anyImg.height };
}

// Compute "cover" crop so the image fills the region without stretching.
export function computeCover(image: CanvasImageSource, r: Region): CoverParams {
  const { w: iw, h: ih } = srcSize(image);
  if (!iw || !ih) {
    return { sx: 0, sy: 0, sw: 1, sh: 1, dx: r.x, dy: r.y, dw: r.w, dh: r.h };
  }
  const scale = Math.max(r.w / iw, r.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = r.x + (r.w - dw) / 2;
  const dy = r.y + (r.h - dh) / 2;
  return { sx: 0, sy: 0, sw: iw, sh: ih, dx, dy, dw, dh };
}

// Draw the image to fill the region (object-fit: cover).
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  r: Region
): void {
  const c = computeCover(image, r);
  ctx.drawImage(image, c.sx, c.sy, c.sw, c.sh, c.dx, c.dy, c.dw, c.dh);
}

// Load a File into a data URL.
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Load a data/URL src into an HTMLImageElement.
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
