"use client";

import { useEffect, useState } from "react";
import PreviewStage from "./PreviewStage";
import ExportDialog from "./ExportDialog";
import ContentPanel from "./panels/ContentPanel";
import LayoutPanel from "./panels/LayoutPanel";
import AnimationPanel from "./panels/AnimationPanel";
import StylePanel from "./panels/StylePanel";
import EmailPanel from "./panels/EmailPanel";

type Tab = "content" | "layout" | "animation" | "style" | "email";

const TABS: { id: Tab; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "layout", label: "Layout" },
  { id: "animation", label: "Animation" },
  { id: "style", label: "Style" },
  { id: "email", label: "Email" },
];

export default function Studio() {
  const [tab, setTab] = useState<Tab>("content");
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch from persisted (localStorage) state.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex h-screen flex-col">
      {/* Topbar */}
      <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-[var(--accent)]" />
          <span className="font-semibold tracking-tight">
            Animated Signature Studio
          </span>
        </div>
        <button
          onClick={() => setExporting(true)}
          className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Export GIF
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
          <nav className="flex border-b border-[var(--border)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 px-1 py-3 text-[13px] font-medium transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "text-[var(--text)] border-b-2 border-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "content" && <ContentPanel />}
            {tab === "layout" && <LayoutPanel />}
            {tab === "animation" && <AnimationPanel />}
            {tab === "style" && <StylePanel />}
            {tab === "email" && <EmailPanel />}
          </div>
        </aside>

        {/* Preview stage */}
        <main className="min-w-0 flex-1 bg-[var(--bg)]">
          <PreviewStage onExport={() => setExporting(true)} />
        </main>
      </div>

      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </div>
  );
}
