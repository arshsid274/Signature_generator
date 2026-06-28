# Animated Signature Studio — Build Plan

A web app that lets anyone create animated email-signature **GIFs** — like the diagonal-strip photo reveal in the Cisco / "Morgan Ellis" reference. Users pick a layout, fill in their details, upload a photo + logo, choose an animation, and export a looping GIF ready to paste into Gmail / Outlook.

---

## 1. Core concept

The whole app rests on one idea: **separate the three things that are usually tangled together.**

| Layer | What it controls | Why it's separate |
|-------|------------------|-------------------|
| **Content** | Name, title, company, email, website, socials, photo, logo, colors | The user's data. Never lost when they switch templates. |
| **Layout** | *Where* each element sits (zones, sizes, alignment) | Swappable templates. Same content reflows into any layout. |
| **Animation** | *How* the photo (or logo/text) reveals | Swappable effects. Diagonal strips, fade, wipe, etc. |

Because these are decoupled, a user can change the layout or the animation at any time and their content just re-flows. This is the part the request specifically calls for — see **Section 4: Layout System**.

---

## 2. Why this is the right output

Email clients **do not run CSS animations or JavaScript**. A "live" HTML preview won't animate inside Gmail or Outlook. The only format that animates reliably in email is an **animated GIF** (and in some clients, animated PNG/WebP, but GIF is the safe universal choice).

So the deliverable is always: **content + layout + animation → rendered to a looping GIF**.
The in-app HTML/Canvas preview exists only so the user can see it before exporting.

---

## 3. Tech stack

Built on the existing Next.js workflow.

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind v4
- **Rendering engine:** HTML `<canvas>` (2D) — every frame is drawn programmatically so it can be captured frame-by-frame for GIF export
- **GIF export (client-side):** `gif.js` (canvas frames → GIF in the browser, no server needed)
- **GIF export (server-side, optional/better quality):** `ffmpeg` on a Node API route or serverless function — fits the existing ffmpeg workflow and gives smaller, cleaner GIFs
- **Image handling:** client-side `FileReader` + `Image` for uploads; optional crop/cover utility
- **State:** lightweight (Zustand or React context) holding the three config objects: `content`, `layout`, `animation`

---

## 4. Layout System  ⭐ (the changeable-layout section)

This is the heart of extensibility. A **layout** is a JSON config that describes a set of **zones** on the signature canvas. Content gets poured into named zones; the layout decides where they land.

### 4.1 Layout schema

```ts
type Zone = {
  id: 'logo' | 'name' | 'title' | 'company' | 'email'
    | 'website' | 'socials' | 'photo' | 'divider';
  x: number;          // 0–1, relative to canvas width
  y: number;          // 0–1, relative to canvas height
  w: number;          // 0–1 width
  h: number;          // 0–1 height
  align: 'left' | 'center' | 'right';
  visible: boolean;
};

type Layout = {
  id: string;
  name: string;            // "Classic Right Photo", "Centered Card"...
  canvas: { w: number; h: number };  // base px, e.g. 800 x 420
  background: string;      // hex or gradient token
  zones: Zone[];
  photoStyle: 'diagonal-strips' | 'circle' | 'rounded' | 'full-bleed';
};
```

### 4.2 Built-in layouts (ship at least these)

| Layout | Photo position | Description |
|--------|----------------|-------------|
| **Classic Right** | Right, diagonal strips | The reference look — logo + text left, animated photo right |
| **Classic Left** | Left, diagonal strips | Mirror of the above |
| **Centered Card** | Top-center, circle | Photo on top, details centered below |
| **Banner** | Full-bleed right | Wide 3:1 banner, photo bleeds off the edge |
| **Minimal Text** | None | No photo — animation applied to the logo or a divider line instead |

### 4.3 How "change layout" works in the UI

A **Layout** tab shows a gallery of thumbnails. Clicking one:

1. Swaps the active `Layout` object.
2. Keeps the existing `content` untouched.
3. Re-renders the canvas — zones reposition, content re-flows.

Nothing the user typed is lost. They can flip between layouts freely.

### 4.4 Optional: drag-to-edit (Phase 2)

Beyond preset layouts, allow power users to **nudge zones directly** — drag the photo or text block on the canvas, and write the new `x/y/w/h` back into a custom layout the user can save. This turns presets into a starting point rather than a cage.

---

## 5. Animation System

An **animation** is a function that, given a progress value `t` (0→1) and a target region, decides how that region is drawn each frame.

```ts
type AnimationDef = {
  id: string;
  name: string;
  durationMs: number;
  // draws the photo (or target) for a given progress t
  render: (ctx, image, region, t, opts) => void;
};
```

### Animations to ship
- **Diagonal strips** (the reference): slice the photo into N parallelogram strips; each starts offset + transparent and eases into place with a staggered delay, leaving thin white gaps between slices.
- **Fade in**
- **Slide in** (from a chosen edge)
- **Wipe** (linear reveal)
- **Reveal + settle** (scale from 1.05 → 1.0 with fade)

### Tunable controls
- Number of strips (3–8)
- Stagger delay between strips
- Skew angle of the diagonal
- Overall speed / duration
- Loop vs. play-once-and-hold

---

## 6. GIF export pipeline

```
content + layout + animation
        │
        ▼
  Canvas renderer  ──►  draw frame at t = 0 … 1  (e.g. 30–40 frames)
        │
        ▼
  Frame capture    ──►  gif.js (browser)  OR  ffmpeg (server)
        │
        ▼
  Looping GIF  ──►  download + "copy for Gmail/Outlook" instructions
```

- Capture frames across the full animation, then add a **hold** at the end (~1s) before the loop restarts so the finished signature is readable.
- Export options: dimensions (1x / 2x retina), frame rate, loop on/off, quality.
- **Server route (ffmpeg)** gives noticeably smaller files — worth adding once the client version works, since email GIFs should stay under ~1 MB for deliverability.

---

## 7. App UI structure

```
┌───────────────────────────────────────────────┐
│  Topbar: wordmark            [Export GIF ▾]    │
├───────────────┬───────────────────────────────┤
│  LEFT PANEL   │   PREVIEW STAGE                │
│  (tabs)       │                                │
│  • Content    │   ┌─────────────────────────┐  │
│  • Layout  ⭐ │   │   live canvas preview    │  │
│  • Animation  │   │   (plays the animation)  │  │
│  • Style      │   └─────────────────────────┘  │
│               │   [▶ Replay]   [Export GIF]    │
└───────────────┴───────────────────────────────┘
```

- **Content tab:** name, title, company, email, website, social toggles + links, photo upload, logo upload.
- **Layout tab:** the gallery of templates (Section 4).
- **Animation tab:** effect picker + tuning sliders (Section 5).
- **Style tab:** accent color, background, fonts, verified-badge toggle.

---

## 8. Data model (single source of truth)

```ts
interface SignatureProject {
  content: {
    name: string; title: string; company: string;
    email: string; website: string;
    socials: { type: string; url: string }[];
    photoSrc?: string; logoSrc?: string;
    accent: string; verified: boolean;
  };
  layoutId: string;       // which Layout preset is active
  customLayout?: Layout;  // if the user dragged/edited zones
  animationId: string;
  animationOpts: {
    strips: number; stagger: number; skew: number;
    durationMs: number; loop: boolean;
  };
  export: { scale: 1 | 2; fps: number; loop: boolean; quality: number };
}
```

Persist this object to `localStorage` (or a DB later) so projects can be saved and reopened. Switching layout = changing `layoutId` only; everything else is preserved.

---

## 9. Build phases

**Phase 1 — Working core**
- Canvas renderer + one layout (Classic Right) + diagonal-strip animation
- Content form + live preview
- Client-side GIF export (gif.js)

**Phase 2 — Layout & animation systems**
- Layout schema + gallery + 4–5 presets (Section 4.2)
- Animation registry + 4–5 effects (Section 5)
- Style tab (colors, fonts, badge)

**Phase 3 — Polish & power features**
- Server-side ffmpeg export for smaller GIFs
- Drag-to-edit custom layouts
- Save / load projects
- "Copy to Gmail / Outlook" paste helper + install instructions
- Real brand SVG icons for social column

**Phase 4 — Productize (optional)**
- Multiple saved signatures per user / team
- Brand kits (lock company logo + colors for a whole team)
- Shareable links

---

## 10. Known gotchas

- **Fonts on canvas:** web fonts must be loaded (`document.fonts.ready`) before drawing, or text falls back. For email realism, default to Arial/Helvetica anyway.
- **GIF file size:** keep under ~1 MB. Fewer colors, fewer frames, and the ffmpeg route all help.
- **Photo aspect ratio:** implement a `drawImageCover()` so uploads fill the photo zone without stretching.
- **Small details (watch, badge, social glyphs):** draw cleanly or they read as artifacts — start simple, refine later.
- **Email client quirks:** some clients block external images; host the final GIF on a reliable URL or embed guidance for the user.