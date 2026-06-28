# Animated Signature Studio

Create animated email-signature **GIFs** — pick a layout, fill in your details,
upload a photo + logo, choose an animation, and export a looping GIF ready to
paste into Gmail / Outlook. Built from [`plan.md`](./plan.md).

## Why a GIF?

Email clients don't run CSS animations or JavaScript, so a "live" HTML preview
won't animate in Gmail/Outlook. The only format that animates reliably in email
is an animated GIF. The in-app canvas preview exists only to check the result
before exporting.

## Architecture — three decoupled layers

| Layer | File | What it controls |
|-------|------|------------------|
| **Content** | `src/lib/store.ts`, `src/lib/types.ts` | Name, title, company, email, photo, logo, colors — the user's data, never lost when switching templates. |
| **Layout** | `src/lib/layouts.ts` | *Where* each element sits — zones as 0–1 fractions of the canvas. Swappable presets; content reflows. |
| **Animation** | `src/lib/animations.ts` | *How* the photo reveals each frame, given progress `t` (0→1). |

The canvas renderer (`src/lib/renderer.ts`) composites these into a frame; the
GIF exporter (`src/lib/gifExport.ts`) draws frames across the animation with a
hold at the end and encodes them to a looping GIF in the browser via
[`gifenc`](https://github.com/mattdesl/gifenc) — no server required.

## Built-in layouts

Classic Right, Classic Left, Centered Card, Banner, Minimal Text.

## Animations

Diagonal Strips (the reference look, tunable strips / stagger / skew), Fade In,
Slide In, Wipe, Reveal + Settle.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

State persists to `localStorage`, so projects survive a reload. Switching layout
changes only `layoutId` — all content is preserved.

## Roadmap (from plan.md)

- **Phase 3:** server-side `ffmpeg` export for smaller files, drag-to-edit
  custom layouts, save/load projects, "copy to Gmail/Outlook" helper, real brand
  SVG social icons.
- **Phase 4:** multiple saved signatures, brand kits, shareable links.
