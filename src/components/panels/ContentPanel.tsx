"use client";

import { useRef } from "react";
import { useProject } from "@/lib/store";
import { fileToDataURL } from "@/lib/imageUtils";
import { Field, TextInput, Button } from "@/components/ui";
import type { SocialLink } from "@/lib/types";

const SOCIAL_TYPES: SocialLink["type"][] = [
  "linkedin",
  "twitter",
  "instagram",
  "github",
  "facebook",
  "youtube",
];

function Upload({
  label,
  src,
  onPick,
  onClear,
}: {
  label: string;
  src?: string;
  onPick: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] overflow-hidden flex items-center justify-center">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-[var(--muted)]">none</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => ref.current?.click()}>Upload</Button>
          {src && (
            <Button variant="ghost" onClick={onClear}>
              Remove
            </Button>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) onPick(await fileToDataURL(file));
            e.target.value = "";
          }}
        />
      </div>
    </Field>
  );
}

export default function ContentPanel() {
  const { project, setContent, setSocial } = useProject();
  const c = project.content;

  return (
    <div>
      <Field label="Full name">
        <TextInput
          value={c.name}
          onChange={(e) => setContent({ name: e.target.value })}
          placeholder="Morgan Ellis"
        />
      </Field>
      <Field label="Job title">
        <TextInput
          value={c.title}
          onChange={(e) => setContent({ title: e.target.value })}
          placeholder="Head of Product Design"
        />
      </Field>
      <Field label="Company">
        <TextInput
          value={c.company}
          onChange={(e) => setContent({ company: e.target.value })}
          placeholder="Northwind Studio"
        />
      </Field>
      <Field label="Email">
        <TextInput
          value={c.email}
          onChange={(e) => setContent({ email: e.target.value })}
          placeholder="you@company.com"
        />
      </Field>
      <Field label="Phone">
        <TextInput
          value={c.phone}
          onChange={(e) => setContent({ phone: e.target.value })}
          placeholder="+1 (555) 000-0000"
        />
      </Field>
      <Field label="Website">
        <TextInput
          value={c.website}
          onChange={(e) => setContent({ website: e.target.value })}
          placeholder="company.com"
        />
      </Field>

      <Upload
        label="Photo"
        src={c.photoSrc}
        onPick={(d) => setContent({ photoSrc: d })}
        onClear={() => setContent({ photoSrc: undefined })}
      />
      <Upload
        label="Logo"
        src={c.logoSrc}
        onPick={(d) => setContent({ logoSrc: d })}
        onClear={() => setContent({ logoSrc: undefined })}
      />

      <div className="mt-2">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)] mb-2">
          Social links
        </span>
        {c.socials.map((s, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <select
              value={s.type}
              onChange={(e) =>
                setSocial(i, { type: e.target.value as SocialLink["type"] })
              }
              className="rounded-lg bg-[var(--panel-2)] border border-[var(--border)] px-2 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            >
              {SOCIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <TextInput
              value={s.url}
              onChange={(e) => setSocial(i, { url: e.target.value })}
              placeholder="https://…"
              className="flex-1"
            />
          </div>
        ))}
        <p className="text-[11px] text-[var(--muted)] mt-1">
          Leave a link blank to hide that icon.
        </p>
      </div>
    </div>
  );
}
