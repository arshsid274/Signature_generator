import type { Content, AnimationOpts } from "./types";
import { getAnimation } from "./animations";
import type { Region } from "./types";

// ── Canvas port of <SignatureCard> ───────────────────────────────────────────
// Draws the whole card (icon column, logo, name+seal, text, animated photo) so
// the ENTIRE signature can be baked into one looping GIF.

export interface CardModel {
  content: Content;
  images: { photo?: CanvasImageSource | null; logo?: CanvasImageSource | null };
  animationOpts: AnimationOpts;
  animationId: string;
}

// Layout metrics in base (1×) units.
const PAD = 26;
const ICON_SIZE = 22;
const ICON_PAD_X = 13;
const ICON_PAD_Y = 13;
const ICON_GAP = 16;
const COL_GAP = 30;
const MIDDLE_W = 300;
const PHOTO_W = 210;
const PHOTO_H = 280;

const easeOut = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function iconList(c: Content): string[] {
  const out: string[] = [];
  if (c.website.trim()) out.push("website");
  for (const s of c.socials) if (s.url.trim()) out.push(s.type);
  return out;
}

export function cardDimensions(c: Content, skew = 18): { w: number; h: number } {
  const icons = iconList(c);
  const iconBoxW = icons.length ? ICON_SIZE + 2 * ICON_PAD_X : 0;
  const skewPx = (Math.min(40, skew) / 40) * 60;
  const photoAreaW = PHOTO_W + skewPx + 60;
  const leftPart = icons.length ? iconBoxW + COL_GAP : 0;
  const w = PAD + leftPart + MIDDLE_W + COL_GAP + photoAreaW + PAD;
  const h = PAD * 2 + PHOTO_H + 16;
  return { w: Math.round(w), h: Math.round(h) };
}

function roundRect(
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

// ── monochrome social icons (canvas) ─────────────────────────────────────────
function drawIcon(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const strokePath = (d: string) => ctx.stroke(new Path2D(d));
  const fillPath = (d: string) => ctx.fill(new Path2D(d));

  switch (key) {
    case "website": {
      ctx.beginPath();
      ctx.arc(12, 12, 10, 0, Math.PI * 2);
      ctx.stroke();
      strokePath("M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20");
      strokePath("M2 12h20");
      break;
    }
    case "instagram": {
      roundRect(ctx, 2, 2, 20, 20, 5);
      ctx.stroke();
      strokePath("M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z");
      ctx.beginPath();
      ctx.arc(17.5, 6.5, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "linkedin": {
      strokePath(
        "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
      );
      roundRect(ctx, 2, 9, 4, 12, 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4, 4, 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "facebook": {
      fillPath(
        "M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396z"
      );
      break;
    }
    case "youtube": {
      strokePath(
        "M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.95 1.97C5.12 19.5 12 19.5 12 19.5s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"
      );
      fillPath("M9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02");
      break;
    }
    case "twitter": {
      fillPath(
        "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      );
      break;
    }
    case "github": {
      fillPath(
        "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.523 2 12 2z"
      );
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(12, 12, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.fillStyle = "#1d9bf0";
  const points = 12;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? size : size * 0.82;
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(ang) * r;
    const py = y + Math.sin(ang) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = Math.max(1.4, size * 0.2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - size * 0.42, y + size * 0.02);
  ctx.lineTo(x - size * 0.08, y + size * 0.36);
  ctx.lineTo(x + size * 0.45, y - size * 0.34);
  ctx.stroke();
  ctx.restore();
}

function drawLogoContain(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  maxW: number,
  maxH: number
) {
  const iw =
    img instanceof HTMLImageElement ? img.naturalWidth : (img as HTMLCanvasElement).width;
  const ih =
    img instanceof HTMLImageElement ? img.naturalHeight : (img as HTMLCanvasElement).height;
  if (!iw || !ih) return 0;
  const scale = Math.min(maxW / iw, maxH / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, x, y, w, h);
  return h;
}

// Entrance envelope for a text group given the reveal progress and a delay.
function entrance(revealT: number, delay: number) {
  const a = easeOut(clamp01((revealT - delay) / 0.4));
  return { alpha: a, dy: (1 - a) * 10 };
}

// Draw the whole card at reveal progress revealT (0 = hidden, 1 = full).
export function renderCardFrame(
  ctx: CanvasRenderingContext2D,
  model: CardModel,
  revealT: number
) {
  const c = model.content;
  const dims = cardDimensions(c, model.animationOpts.skew);
  const skewPx = (model.animationOpts.skew / 40) * 60;

  // Card background + border
  ctx.clearRect(0, 0, dims.w, dims.h);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 1, 1, dims.w - 2, dims.h - 2, 16);
  ctx.fill();
  ctx.strokeStyle = "#e6e7ea";
  ctx.lineWidth = 1;
  ctx.stroke();

  const icons = iconList(c);
  const hasIcons = icons.length > 0;
  const iconBoxW = hasIcons ? ICON_SIZE + 2 * ICON_PAD_X : 0;

  // ── left: icon column ──
  let cursorX = PAD;
  if (hasIcons) {
    const boxH = icons.length * ICON_SIZE + (icons.length - 1) * ICON_GAP + 2 * ICON_PAD_Y;
    const boxY = (dims.h - boxH) / 2;
    const ent = entrance(revealT, 0);
    ctx.save();
    ctx.globalAlpha = ent.alpha;
    ctx.translate(0, ent.dy);
    ctx.strokeStyle = "#e6e7ea";
    ctx.lineWidth = 1;
    roundRect(ctx, cursorX, boxY, iconBoxW, boxH, 12);
    ctx.stroke();
    icons.forEach((key, i) => {
      const iy = boxY + ICON_PAD_Y + i * (ICON_SIZE + ICON_GAP);
      drawIcon(ctx, key, cursorX + ICON_PAD_X, iy, ICON_SIZE, "#0f0f10");
    });
    ctx.restore();
    cursorX += iconBoxW + COL_GAP;
  }

  // ── middle: logo + details ──
  const midX = cursorX;
  // estimate block height for vertical centering
  const lineH = 22;
  const estH = 46 + 10 + 36 + 24 + 22 + 4 * lineH;
  let y = Math.max(PAD + 6, (dims.h - estH) / 2);

  // logo / wordmark
  {
    const ent = entrance(revealT, 0);
    ctx.save();
    ctx.globalAlpha = ent.alpha;
    ctx.translate(0, ent.dy);
    if (model.images.logo) {
      const h = drawLogoContain(ctx, model.images.logo, midX, y, 130, 46);
      y += (h || 30) + 18;
    } else {
      ctx.fillStyle = c.accent;
      ctx.font = "800 26px Arial, Helvetica, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(c.company || "Company", midX, y + 24);
      y += 46;
    }
    ctx.restore();
  }

  // name + seal
  {
    const ent = entrance(revealT, 0.06);
    ctx.save();
    ctx.globalAlpha = ent.alpha;
    ctx.translate(0, ent.dy);
    ctx.fillStyle = "#0b0c0f";
    ctx.font = "800 28px Arial, Helvetica, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const name = c.name || "Your Name";
    ctx.fillText(name, midX, y + 22);
    if (c.verified) {
      const w = ctx.measureText(name).width;
      drawSeal(ctx, midX + w + 16, y + 12, 11);
    }
    ctx.restore();
    y += 38;
  }

  // title
  if (c.title) {
    const ent = entrance(revealT, 0.12);
    ctx.save();
    ctx.globalAlpha = ent.alpha;
    ctx.translate(0, ent.dy);
    ctx.fillStyle = "#3c3f46";
    ctx.font = "400 17px Arial, Helvetica, sans-serif";
    ctx.fillText(c.title, midX, y + 16);
    ctx.restore();
    y += 30;
  }

  // contact block
  {
    const ent = entrance(revealT, 0.18);
    ctx.save();
    ctx.globalAlpha = ent.alpha;
    ctx.translate(0, ent.dy);
    ctx.textAlign = "left";
    let cy = y + 16;
    if (c.company) {
      ctx.fillStyle = "#0b0c0f";
      ctx.font = "700 17px Arial, Helvetica, sans-serif";
      ctx.fillText(c.company, midX, cy);
      cy += lineH;
    }
    ctx.font = "400 16px Arial, Helvetica, sans-serif";
    const line = (text: string, color: string) => {
      if (!text) return;
      ctx.fillStyle = color;
      ctx.fillText(text, midX, cy);
      cy += lineH;
    };
    line(c.phone, "#1a1c22");
    line(c.email, "#1a1c22");
    line(c.website, c.accent);
    ctx.restore();
  }

  // ── right: animated photo ──
  if (model.images.photo) {
    const photoX = dims.w - PAD - PHOTO_W;
    const photoY = (dims.h - PHOTO_H) / 2;
    const region: Region = { x: photoX, y: photoY, w: PHOTO_W, h: PHOTO_H };

    // decorative gray parallelograms to the left
    ctx.save();
    ctx.fillStyle = "#eef0f2";
    const deco = (dx: number, top: number, h: number, topW: number) => {
      const bx = photoX - dx;
      ctx.beginPath();
      ctx.moveTo(bx + skewPx, photoY + top);
      ctx.lineTo(bx + skewPx + topW, photoY + top);
      ctx.lineTo(bx + topW, photoY + top + h);
      ctx.lineTo(bx, photoY + top + h);
      ctx.closePath();
      ctx.fill();
    };
    deco(58, 0, PHOTO_H, 40);
    deco(28, PHOTO_H * 0.2, PHOTO_H * 0.6, 30);
    ctx.restore();

    const anim = getAnimation(model.animationId);
    anim.render(ctx, model.images.photo, region, clamp01(revealT), model.animationOpts);
  }
}
