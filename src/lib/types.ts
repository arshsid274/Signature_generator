// ── Single source of truth for the whole app ──────────────────────────────
// Three decoupled layers: Content (the user's data), Layout (where things sit),
// Animation (how the photo reveals). See plan.md §1.

export type ZoneId =
  | "logo"
  | "name"
  | "title"
  | "company"
  | "email"
  | "website"
  | "socials"
  | "photo"
  | "divider";

export type Align = "left" | "center" | "right";

export interface Zone {
  id: ZoneId;
  x: number; // 0–1, relative to canvas width
  y: number; // 0–1, relative to canvas height
  w: number; // 0–1 width
  h: number; // 0–1 height
  align: Align;
  visible: boolean;
}

export type PhotoStyle = "diagonal-strips" | "circle" | "rounded" | "full-bleed";

export interface Layout {
  id: string;
  name: string;
  canvas: { w: number; h: number };
  background: string; // hex
  zones: Zone[];
  photoStyle: PhotoStyle;
}

export interface SocialLink {
  type: "linkedin" | "twitter" | "instagram" | "github" | "facebook" | "youtube";
  url: string;
}

export interface Content {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  socials: SocialLink[];
  photoSrc?: string; // data URL
  logoSrc?: string; // data URL
  accent: string; // hex
  textColor: string; // hex
  verified: boolean;
}

export interface AnimationOpts {
  strips: number; // 3–8
  stagger: number; // 0–1, delay fraction between strips
  skew: number; // degrees of the diagonal
  durationMs: number;
  loop: boolean;
  // Photo framing inside the slice-reveal silhouette (ported from index.html)
  zoom: number; // 0.5–2.8, 1 = cover
  offsetX: number; // silhouette-px pan, −400…400
  offsetY: number; // silhouette-px pan, −400…400
}

export interface ExportOpts {
  scale: 1 | 2;
  fps: number;
  loop: boolean;
  quality: number; // 1 (best) – 30 (worst), gifenc-ish
  holdMs: number; // pause on the finished frame before looping
}

export interface SignatureProject {
  content: Content;
  layoutId: string;
  customLayout?: Layout;
  animationId: string;
  animationOpts: AnimationOpts;
  export: ExportOpts;
}

// What the renderer/animation functions receive.
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnimationDef {
  id: string;
  name: string;
  durationMs: number;
  // Draw the photo (target) for a given progress t (0→1) into `region`.
  render: (
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource,
    region: Region,
    t: number,
    opts: AnimationOpts
  ) => void;
}
