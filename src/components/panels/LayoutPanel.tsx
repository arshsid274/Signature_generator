"use client";

import { useEffect, useRef } from "react";
import { useProject } from "@/lib/store";
import { useLoadedImages } from "@/hooks/useLoadedImages";
import { LAYOUTS } from "@/lib/layouts";
import { getAnimation } from "@/lib/animations";
import { renderFrame } from "@/lib/renderer";
import type { Layout } from "@/lib/types";

function Thumb({ layout, active }: { layout: Layout; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { project } = useProject();
  const { photo, logo } = useLoadedImages(
    project.content.photoSrc,
    project.content.logoSrc
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const TW = 240;
    const scale = TW / layout.canvas.w;
    canvas.width = TW;
    canvas.height = Math.round(layout.canvas.h * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    renderFrame(ctx, {
      content: project.content,
      layout,
      animation: getAnimation(project.animationId),
      animationOpts: project.animationOpts,
      images: { photo, logo },
      t: 1,
    });
  }, [layout, project, photo, logo]);

  return (
    <canvas
      ref={ref}
      className={`w-full rounded-md border bg-white ${
        active ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)]"
      }`}
    />
  );
}

export default function LayoutPanel() {
  const { project, setLayout } = useProject();

  return (
    <div className="grid grid-cols-1 gap-3">
      {LAYOUTS.map((l) => {
        const active = project.layoutId === l.id;
        return (
          <button
            key={l.id}
            onClick={() => setLayout(l.id)}
            className="text-left group"
          >
            <Thumb layout={l} active={active} />
            <div className="mt-1.5 flex items-center justify-between">
              <span
                className={`text-sm font-medium ${
                  active ? "text-[var(--text)]" : "text-[var(--muted)]"
                }`}
              >
                {l.name}
              </span>
              {active && (
                <span className="text-[10px] uppercase tracking-wide text-[var(--accent)]">
                  active
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
