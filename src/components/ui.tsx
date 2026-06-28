"use client";

import React from "react";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block mb-3.5">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)] mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-[var(--muted)] mt-1">{hint}</span>}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-lg bg-[var(--panel-2)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors " +
        (props.className ?? "")
      }
    />
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  display,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  display?: string;
}) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
          {label}
        </span>
        <span className="text-[11px] tabular-nums text-[var(--text)]">
          {display ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </div>
  );
}

export function Button({
  children,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    default:
      "bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]",
    primary:
      "bg-[var(--accent)] text-white hover:opacity-90 border border-transparent",
    ghost: "text-[var(--muted)] hover:text-[var(--text)]",
  }[variant];
  return (
    <button {...props} className={`${base} ${styles} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded-md bg-transparent border border-[var(--border)] cursor-pointer p-0.5"
      />
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between mb-3.5 cursor-pointer">
      <span className="text-sm text-[var(--text)]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
