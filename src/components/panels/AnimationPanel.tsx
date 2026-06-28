"use client";

import { useProject } from "@/lib/store";
import { ANIMATIONS } from "@/lib/animations";
import { Slider, Toggle } from "@/components/ui";

export default function AnimationPanel() {
  const { project, setAnimation, setAnimationOpts } = useProject();
  const a = project.animationOpts;
  const isStrips = project.animationId === "diagonal-strips";
  const isSlice = project.animationId === "slice-reveal";

  return (
    <div>
      <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)] mb-2">
        Effect
      </span>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {ANIMATIONS.map((anim) => {
          const active = project.animationId === anim.id;
          return (
            <button
              key={anim.id}
              onClick={() => setAnimation(anim.id)}
              className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]"
                  : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              {anim.name}
            </button>
          );
        })}
      </div>

      <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)] mb-2">
        Tuning
      </span>

      {isStrips && (
        <>
          <Slider
            label="Strips"
            value={a.strips}
            min={3}
            max={8}
            step={1}
            onChange={(v) => setAnimationOpts({ strips: v })}
          />
          <Slider
            label="Stagger"
            value={a.stagger}
            min={0}
            max={0.9}
            step={0.05}
            display={`${Math.round(a.stagger * 100)}%`}
            onChange={(v) => setAnimationOpts({ stagger: v })}
          />
          <Slider
            label="Skew angle"
            value={a.skew}
            min={0}
            max={40}
            step={1}
            display={`${a.skew}°`}
            onChange={(v) => setAnimationOpts({ skew: v })}
          />
        </>
      )}

      <Slider
        label={isSlice ? "Speed" : "Duration"}
        value={a.durationMs}
        min={600}
        max={4000}
        step={100}
        display={`${(a.durationMs / 1000).toFixed(1)}s`}
        onChange={(v) => setAnimationOpts({ durationMs: v })}
      />

      {isSlice && (
        <>
          <Slider
            label="Photo zoom"
            value={a.zoom}
            min={0.5}
            max={2.8}
            step={0.02}
            display={`${Math.round(a.zoom * 100)}%`}
            onChange={(v) => setAnimationOpts({ zoom: v })}
          />
          <Slider
            label="Move X"
            value={a.offsetX}
            min={-400}
            max={400}
            step={2}
            display={`${a.offsetX}`}
            onChange={(v) => setAnimationOpts({ offsetX: v })}
          />
          <Slider
            label="Move Y"
            value={a.offsetY}
            min={-400}
            max={400}
            step={2}
            display={`${a.offsetY}`}
            onChange={(v) => setAnimationOpts({ offsetY: v })}
          />
        </>
      )}

      <Toggle
        label="Loop animation"
        checked={a.loop}
        onChange={(v) => setAnimationOpts({ loop: v })}
      />
    </div>
  );
}
