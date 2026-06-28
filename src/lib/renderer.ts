import type {
  AnimationDef,
  AnimationOpts,
  Content,
  Layout,
  Region,
  Zone,
} from "./types";
import { computeCover, drawImageCover } from "./imageUtils";

export interface RenderImages {
  photo?: CanvasImageSource | null;
  logo?: CanvasImageSource | null;
}

export interface RenderOptions {
  content: Content;
  layout: Layout;
  animation: AnimationDef;
  animationOpts: AnimationOpts;
  images: RenderImages;
  t: number; // 0→1 animation progress
}

function regionOf(zone: Zone, layout: Layout): Region {
  return {
    x: zone.x * layout.canvas.w,
    y: zone.y * layout.canvas.h,
    w: zone.w * layout.canvas.w,
    h: zone.h * layout.canvas.h,
  };
}

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Pick readable text color depending on background luminance.
function isDark(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  r: Region,
  alignLeft = true
) {
  const c = computeCover(image, { x: 0, y: 0, w: 1, h: 1 });
  // computeCover normalized just to read source size; recompute contain:
  const iw = c.sw;
  const ih = c.sh;
  if (!iw || !ih) return;
  const scale = Math.min(r.w / iw, r.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = alignLeft ? r.x : r.x + (r.w - dw) / 2;
  const dy = r.y + (r.h - dh) / 2;
  ctx.drawImage(image, 0, 0, iw, ih, dx, dy, dw, dh);
}

function textAlignFor(zone: Zone): CanvasTextAlign {
  return zone.align === "center"
    ? "center"
    : zone.align === "right"
    ? "right"
    : "left";
}

function anchorX(zone: Zone, r: Region): number {
  if (zone.align === "center") return r.x + r.w / 2;
  if (zone.align === "right") return r.x + r.w;
  return r.x;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  zone: Zone,
  r: Region,
  fontPx: number,
  weight: number,
  color: string
) {
  if (!text) return;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${fontPx}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = textAlignFor(zone);
  ctx.textBaseline = "middle";
  ctx.fillText(text, anchorX(zone, r), r.y + r.h / 2);
}

function drawVerified(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  _accent: string
) {
  ctx.save();
  // Blue scalloped "verified" seal (Twitter-style), independent of accent.
  ctx.fillStyle = "#1d9bf0";
  const points = 12;
  const outer = size;
  const inner = size * 0.82;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(ang) * r;
    const py = y + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.5, size * 0.18);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - size * 0.42, y + size * 0.02);
  ctx.lineTo(x - size * 0.08, y + size * 0.36);
  ctx.lineTo(x + size * 0.45, y - size * 0.34);
  ctx.stroke();
  ctx.restore();
}

const SOCIAL_COLORS: Record<string, string> = {
  linkedin: "#0a66c2",
  twitter: "#1d9bf0",
  instagram: "#e1306c",
  github: "#333333",
  facebook: "#1877f2",
  youtube: "#ff0000",
};

function drawSocials(
  ctx: CanvasRenderingContext2D,
  content: Content,
  zone: Zone,
  r: Region
) {
  const items = content.socials.filter((s) => s.url.trim().length > 0);
  if (items.length === 0) return;
  const d = Math.min(r.h, r.w / Math.max(items.length, 1)) * 0.9;
  const radius = d / 2;
  const gap = d * 0.45;
  const totalW = items.length * d + (items.length - 1) * gap;
  let startX: number;
  if (zone.align === "center") startX = r.x + (r.w - totalW) / 2;
  else if (zone.align === "right") startX = r.x + r.w - totalW;
  else startX = r.x;
  const cy = r.y + r.h / 2;

  items.forEach((s, i) => {
    const cx = startX + radius + i * (d + gap);
    ctx.fillStyle = SOCIAL_COLORS[s.type] ?? content.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    // first letter as a simple glyph
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${radius}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.type.charAt(0).toUpperCase(), cx, cy + radius * 0.05);
  });
}

function clipPhotoStyle(
  ctx: CanvasRenderingContext2D,
  r: Region,
  style: Layout["photoStyle"]
) {
  if (style === "circle") {
    const d = Math.min(r.w, r.h);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (style === "rounded") {
    roundRectPath(ctx, r.x, r.y, r.w, r.h, Math.min(r.w, r.h) * 0.12);
    ctx.clip();
  } else {
    // rect / full-bleed
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
  }
}

// ── main entry: draw a full frame at progress t ──────────────────────────────
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  o: RenderOptions
): void {
  const { content, layout, animation, animationOpts, images, t } = o;
  const { w, h } = layout.canvas;

  // Background
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = layout.background;
  ctx.fillRect(0, 0, w, h);

  const dark = isDark(layout.background);
  const baseText = content.textColor || (dark ? "#f4f6fb" : "#1a1d24");
  const mutedText = dark ? "#aab2c2" : "#6b7280";

  const zones = layout.zones.filter((z) => z.visible);
  const photoZone = layout.zones.find((z) => z.id === "photo" && z.visible);
  const hasPhoto = !!photoZone && !!images.photo;

  for (const zone of zones) {
    const r = regionOf(zone, layout);

    switch (zone.id) {
      case "photo": {
        if (!images.photo) break;
        ctx.save();
        // The slice-reveal's silhouette mask already defines the shape.
        if (animation.id !== "slice-reveal")
          clipPhotoStyle(ctx, r, layout.photoStyle);
        animation.render(ctx, images.photo, r, t, animationOpts);
        ctx.restore();
        break;
      }
      case "logo": {
        if (images.logo) {
          drawImageContain(ctx, images.logo, r, zone.align !== "center");
        } else if (content.company) {
          // wordmark fallback
          drawText(
            ctx,
            content.company,
            zone,
            r,
            r.h * 0.62,
            800,
            content.accent
          );
        }
        break;
      }
      case "name": {
        const fontPx = Math.min(r.h * 0.92, h * 0.12);
        drawText(ctx, content.name, zone, r, fontPx, 700, baseText);
        if (content.verified && content.name) {
          ctx.font = `700 ${fontPx}px Arial, sans-serif`;
          const tw = ctx.measureText(content.name).width;
          const bx =
            zone.align === "center"
              ? anchorX(zone, r) + tw / 2 + fontPx * 0.5
              : zone.align === "right"
              ? anchorX(zone, r) + fontPx * 0.5
              : r.x + tw + fontPx * 0.5;
          drawVerified(
            ctx,
            bx,
            r.y + r.h / 2,
            fontPx * 0.34,
            content.accent
          );
        }
        break;
      }
      case "title":
        drawText(ctx, content.title, zone, r, r.h * 0.78, 600, content.accent);
        break;
      case "company":
        drawText(ctx, content.company, zone, r, r.h * 0.74, 500, mutedText);
        break;
      case "email":
        drawText(ctx, content.email, zone, r, r.h * 0.6, 500, baseText);
        break;
      case "website":
        drawText(ctx, content.website, zone, r, r.h * 0.6, 500, mutedText);
        break;
      case "socials":
        drawSocials(ctx, content, zone, r);
        break;
      case "divider": {
        // If there's no photo to animate, the divider becomes the animated
        // target — it draws on with progress t (plan.md §4.2 Minimal Text).
        const reveal = hasPhoto ? 1 : clamp01(t);
        ctx.fillStyle = content.accent;
        ctx.fillRect(r.x, r.y, Math.max(r.w, 2) * reveal, Math.max(r.h, 2));
        break;
      }
    }
  }
}

// ── Photo-only frame (for the standalone animated-photo GIF) ─────────────────
// Renders just the photo region, animated — this is what gets embedded into the
// HTML email signature as a small looping GIF.
export interface PhotoFrameOptions {
  image: CanvasImageSource;
  photoStyle: Layout["photoStyle"];
  animation: AnimationDef;
  animationOpts: AnimationOpts;
  width: number;
  height: number;
  t: number;
  background?: string; // solid fill; omit for transparent
}

export function renderPhotoFrame(
  ctx: CanvasRenderingContext2D,
  o: PhotoFrameOptions
): void {
  const { image, photoStyle, animation, animationOpts, width, height, t } = o;
  ctx.clearRect(0, 0, width, height);
  if (o.background) {
    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, width, height);
  }
  const region: Region = { x: 0, y: 0, w: width, h: height };
  ctx.save();
  if (animation.id !== "slice-reveal")
    clipPhotoStyle(ctx, region, photoStyle);
  animation.render(ctx, image, region, t, animationOpts);
  ctx.restore();
}

// ── Logo-only frame (for the standalone animated-logo GIF) ───────────────────
// Renders just the logo, contain-fit (never cropped), with a fade + gentle rise
// reveal — embedded into the HTML signature as its own small looping GIF so the
// logo animates while the surrounding text stays static.
export interface LogoFrameOptions {
  image: CanvasImageSource;
  width: number;
  height: number;
  t: number;
  background?: string; // solid fill; omit for transparent
  align?: "left" | "center";
}

export function renderLogoFrame(
  ctx: CanvasRenderingContext2D,
  o: LogoFrameOptions
): void {
  const { image, width, height, t } = o;
  ctx.clearRect(0, 0, width, height);
  if (o.background) {
    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, width, height);
  }
  const e = easeOutCubic(clamp01(t));
  const rise = (1 - e) * height * 0.16; // slides up into place
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  ctx.globalAlpha = e;
  drawImageContain(
    ctx,
    image,
    { x: 0, y: rise, w: width, h: height },
    o.align !== "center"
  );
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Render the full project to a fresh offscreen-able canvas context at t.
export { regionOf };
