"use client";

import { useState } from "react";
import { useProject } from "@/lib/store";
import { useLoadedImages } from "@/hooks/useLoadedImages";
import { exportGif, type ExportResult } from "@/lib/gifExport";
import { Button, Slider, Toggle } from "@/components/ui";

export default function ExportDialog({ onClose }: { onClose: () => void }) {
  const { project, setExport } = useProject();
  const { photo, logo } = useLoadedImages(
    project.content.photoSrc,
    project.content.logoSrc
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExportResult | null>(null);
  const e = project.export;

  const run = async () => {
    setBusy(true);
    setProgress(0);
    setResult(null);
    try {
      const r = await exportGif(project, { photo, logo }, setProgress);
      setResult(r);
    } catch (err) {
      console.error(err);
      alert("Export failed: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    const slug =
      project.content.name.trim().toLowerCase().replace(/\s+/g, "-") ||
      "signature";
    a.download = `${slug}-signature.gif`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Export GIF</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2">
          <button
            onClick={() => setExport({ scale: 1 })}
            className={`rounded-lg border px-3 py-2 text-sm ${
              e.scale === 1
                ? "border-[var(--accent)] text-[var(--text)]"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            1× standard
          </button>
          <button
            onClick={() => setExport({ scale: 2 })}
            className={`rounded-lg border px-3 py-2 text-sm ${
              e.scale === 2
                ? "border-[var(--accent)] text-[var(--text)]"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            2× retina
          </button>
        </div>

        <Slider
          label="Frame rate"
          value={e.fps}
          min={10}
          max={30}
          step={1}
          display={`${e.fps} fps`}
          onChange={(v) => setExport({ fps: v })}
        />
        <Slider
          label="Quality / size"
          value={e.quality}
          min={1}
          max={28}
          step={1}
          display={e.quality < 8 ? "high" : e.quality < 18 ? "balanced" : "small"}
          onChange={(v) => setExport({ quality: v })}
        />
        <Slider
          label="End hold"
          value={e.holdMs}
          min={0}
          max={2500}
          step={100}
          display={`${(e.holdMs / 1000).toFixed(1)}s`}
          onChange={(v) => setExport({ holdMs: v })}
        />
        <Toggle
          label="Loop forever"
          checked={e.loop}
          onChange={(v) => setExport({ loop: v })}
        />

        {busy && (
          <div className="my-3">
            <div className="h-2 w-full rounded-full bg-[var(--panel-2)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-1">
              Rendering frames… {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {result && (
          <div className="my-3 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt="exported signature"
              className="w-full rounded-md border border-[var(--border)] bg-white"
            />
            <p className="text-[11px] text-[var(--muted)] mt-2">
              {result.width}×{result.height}px · {result.frames} frames ·{" "}
              {(result.bytes / 1024).toFixed(0)} KB
              {result.bytes > 1024 * 1024 && (
                <span className="text-amber-400">
                  {" "}
                  · over 1 MB — raise quality/size slider for email
                </span>
              )}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {!result ? (
            <Button
              variant="primary"
              onClick={run}
              disabled={busy}
              className="flex-1"
            >
              {busy ? "Rendering…" : "Render GIF"}
            </Button>
          ) : (
            <>
              <Button variant="primary" onClick={download} className="flex-1">
                Download
              </Button>
              <Button onClick={run} disabled={busy}>
                Re-render
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
