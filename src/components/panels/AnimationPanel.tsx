"use client";

import { useProject } from "@/lib/store";
import { ANIMATIONS } from "@/lib/animations";
import { Slider, Toggle } from "@/components/ui";

export default function AnimationPanel() {
  const { project, setAnimation, setAnimationOpts } = useProject();
  const a = project.animationOpts;
  const isStrips = project.animationId === "diagonal-strips";

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
        label="Duration"
        value={a.durationMs}
        min={600}
        max={4000}
        step={100}
        display={`${(a.durationMs / 1000).toFixed(1)}s`}
        onChange={(v) => setAnimationOpts({ durationMs: v })}
      />

      <Toggle
        label="Loop animation"
        checked={a.loop}
        onChange={(v) => setAnimationOpts({ loop: v })}
      />
    </div>
  );
}
