import type { Layout, Zone } from "./types";

// Helper to make zone definitions terse.
function z(
  id: Zone["id"],
  x: number,
  y: number,
  w: number,
  h: number,
  align: Zone["align"] = "left",
  visible = true
): Zone {
  return { id, x, y, w, h, align, visible };
}

const CANVAS = { w: 800, h: 420 };

// ── Built-in layouts (plan.md §4.2) ────────────────────────────────────────
// All coordinates are 0–1 fractions of the canvas, so content reflows into
// whichever layout is active without losing any of the user's data.

export const LAYOUTS: Layout[] = [
  {
    id: "classic-right",
    name: "Classic Right",
    canvas: CANVAS,
    background: "#ffffff",
    photoStyle: "diagonal-strips",
    zones: [
      z("logo", 0.06, 0.12, 0.2, 0.16, "left"),
      z("name", 0.06, 0.34, 0.5, 0.12, "left"),
      z("title", 0.06, 0.47, 0.5, 0.09, "left"),
      z("company", 0.06, 0.56, 0.5, 0.09, "left"),
      z("divider", 0.06, 0.67, 0.42, 0.004, "left"),
      z("email", 0.06, 0.71, 0.5, 0.08, "left"),
      z("website", 0.06, 0.79, 0.5, 0.08, "left"),
      z("socials", 0.06, 0.88, 0.4, 0.08, "left"),
      z("photo", 0.62, 0.0, 0.38, 1.0, "center"),
    ],
  },
  {
    id: "classic-left",
    name: "Classic Left",
    canvas: CANVAS,
    background: "#ffffff",
    photoStyle: "diagonal-strips",
    zones: [
      z("photo", 0.0, 0.0, 0.38, 1.0, "center"),
      z("logo", 0.46, 0.12, 0.2, 0.16, "left"),
      z("name", 0.46, 0.34, 0.5, 0.12, "left"),
      z("title", 0.46, 0.47, 0.5, 0.09, "left"),
      z("company", 0.46, 0.56, 0.5, 0.09, "left"),
      z("divider", 0.46, 0.67, 0.42, 0.004, "left"),
      z("email", 0.46, 0.71, 0.5, 0.08, "left"),
      z("website", 0.46, 0.79, 0.5, 0.08, "left"),
      z("socials", 0.46, 0.88, 0.4, 0.08, "left"),
    ],
  },
  {
    id: "centered-card",
    name: "Centered Card",
    canvas: { w: 640, h: 520 },
    background: "#ffffff",
    photoStyle: "circle",
    zones: [
      z("photo", 0.38, 0.06, 0.24, 0.3, "center"),
      z("name", 0.1, 0.42, 0.8, 0.1, "center"),
      z("title", 0.1, 0.53, 0.8, 0.07, "center"),
      z("company", 0.1, 0.61, 0.8, 0.07, "center"),
      z("divider", 0.3, 0.71, 0.4, 0.004, "center"),
      z("email", 0.1, 0.75, 0.8, 0.06, "center"),
      z("website", 0.1, 0.82, 0.8, 0.06, "center"),
      z("socials", 0.3, 0.9, 0.4, 0.07, "center"),
      z("logo", 0.4, 0.0, 0.2, 0.06, "center", false),
    ],
  },
  {
    id: "banner",
    name: "Banner",
    canvas: { w: 900, h: 300 },
    background: "#0f1222",
    photoStyle: "full-bleed",
    zones: [
      z("logo", 0.05, 0.14, 0.18, 0.2, "left"),
      z("name", 0.05, 0.4, 0.5, 0.16, "left"),
      z("title", 0.05, 0.58, 0.5, 0.1, "left"),
      z("company", 0.05, 0.68, 0.5, 0.1, "left"),
      z("email", 0.05, 0.82, 0.35, 0.1, "left"),
      z("website", 0.4, 0.82, 0.3, 0.1, "left"),
      z("socials", 0.05, 0.92, 0.4, 0.08, "left", false),
      z("photo", 0.62, 0.0, 0.38, 1.0, "center"),
    ],
  },
  {
    id: "minimal-text",
    name: "Minimal Text",
    canvas: { w: 760, h: 280 },
    background: "#ffffff",
    photoStyle: "rounded",
    zones: [
      z("logo", 0.06, 0.16, 0.22, 0.2, "left"),
      z("name", 0.06, 0.42, 0.7, 0.16, "left"),
      z("title", 0.06, 0.6, 0.7, 0.1, "left"),
      z("company", 0.06, 0.7, 0.7, 0.1, "left"),
      z("divider", 0.06, 0.36, 0.5, 0.006, "left"),
      z("email", 0.06, 0.84, 0.4, 0.1, "left"),
      z("website", 0.45, 0.84, 0.4, 0.1, "left"),
      z("socials", 0.62, 0.16, 0.3, 0.1, "right"),
      // No photo zone — the animation targets the divider line instead.
      z("photo", 0, 0, 0, 0, "center", false),
    ],
  },
];

export function getLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}
