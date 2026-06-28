"use client";

import { useProject } from "@/lib/store";
import { Field, ColorInput, Toggle } from "@/components/ui";

const PRESET_ACCENTS = [
  "#6366f1",
  "#0a66c2",
  "#e11d48",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#111827",
];

export default function StylePanel() {
  const { project, setContent } = useProject();
  const c = project.content;

  return (
    <div>
      <Field label="Accent color">
        <ColorInput
          value={c.accent}
          onChange={(v) => setContent({ accent: v })}
        />
        <div className="flex gap-2 mt-2">
          {PRESET_ACCENTS.map((p) => (
            <button
              key={p}
              onClick={() => setContent({ accent: p })}
              className="h-6 w-6 rounded-full border border-[var(--border)]"
              style={{ background: p }}
              aria-label={p}
            />
          ))}
        </div>
      </Field>

      <Field label="Text color" hint="Used for the name and primary text.">
        <ColorInput
          value={c.textColor}
          onChange={(v) => setContent({ textColor: v })}
        />
      </Field>

      <div className="mt-4">
        <Toggle
          label="Verified badge"
          checked={c.verified}
          onChange={(v) => setContent({ verified: v })}
        />
      </div>

      <p className="text-[11px] text-[var(--muted)] mt-3 leading-relaxed">
        Background comes from the chosen layout. Fonts default to Arial /
        Helvetica so the signature renders identically inside Gmail and Outlook.
      </p>
    </div>
  );
}
