// Generate small, brand-coloured social-icon tiles as PNG data URLs, drawn
// client-side on a canvas. Self-contained — no external CDN — so the signature
// keeps working anywhere it's pasted. Real brand SVGs are a later polish item.

export type IconKey =
  | "website"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "github"
  | "facebook"
  | "youtube";

const BRAND: Record<IconKey, string> = {
  website: "#475569",
  linkedin: "#0a66c2",
  twitter: "#000000",
  instagram: "#e1306c",
  github: "#24292f",
  facebook: "#1877f2",
  youtube: "#ff0000",
};

const GLYPH: Record<IconKey, string> = {
  website: "@",
  linkedin: "in",
  twitter: "X",
  instagram: "ig",
  github: "gh",
  facebook: "f",
  youtube: "▶", // ▶
};

const cache = new Map<string, string>();

function makeIcon(key: IconKey): string {
  const hit = cache.get(key);
  if (hit) return hit;

  const SIZE = 48; // 2× of the 24px display size
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const r = 12;
  ctx.fillStyle = BRAND[key];
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(SIZE, 0, SIZE, SIZE, r);
  ctx.arcTo(SIZE, SIZE, 0, SIZE, r);
  ctx.arcTo(0, SIZE, 0, 0, r);
  ctx.arcTo(0, 0, SIZE, 0, r);
  ctx.closePath();
  ctx.fill();

  const glyph = GLYPH[key];
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontPx = glyph.length > 1 ? 22 : 28;
  ctx.font = `700 ${fontPx}px Arial, Helvetica, sans-serif`;
  ctx.fillText(glyph, SIZE / 2, SIZE / 2 + 2);

  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

// Build a { key: dataUrl } map for the requested icon keys.
export function socialIconMap(keys: IconKey[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = makeIcon(k);
  return out;
}
