"use client";

import { useMemo, useState } from "react";
import { useProject } from "@/lib/store";
import { useLoadedImages } from "@/hooks/useLoadedImages";
import { getLayout } from "@/lib/layouts";
import { exportPhotoGif, type PhotoGifResult } from "@/lib/photoGif";
import { exportCardGif, type CardGifResult } from "@/lib/cardGif";
import { buildSignatureHtml, buildSignatureText } from "@/lib/signatureHtml";
import { socialIconMap, type IconKey } from "@/lib/socialIcons";
import { copyRichHtml } from "@/lib/clipboard";
import { Button, Toggle } from "@/components/ui";

const PHOTO_DISPLAY_W = 140;

type Mode = "photo" | "card";

export default function EmailPanel() {
  const { project } = useProject();
  const { photo, logo } = useLoadedImages(
    project.content.photoSrc,
    project.content.logoSrc
  );
  const layout = getLayout(project.layoutId);
  const hasPhotoZone = layout.zones.some((z) => z.id === "photo" && z.visible);

  const [mode, setMode] = useState<Mode>("card");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gif, setGif] = useState<PhotoGifResult | null>(null);
  const [cardGif, setCardGif] = useState<CardGifResult | null>(null);
  const [copied, setCopied] = useState<"none" | "rich" | "fail">("none");
  const [showSource, setShowSource] = useState(false);
  const [showFooter, setShowFooter] = useState(true);

  const icons = useMemo(() => {
    const keys: IconKey[] = [];
    if (project.content.website.trim()) keys.push("website");
    for (const s of project.content.socials) {
      if (s.url.trim()) keys.push(s.type as IconKey);
    }
    return socialIconMap(keys);
  }, [project.content.website, project.content.socials]);

  const photoDims = useMemo(() => {
    if (!gif) return { w: PHOTO_DISPLAY_W, h: Math.round(PHOTO_DISPLAY_W * 1.2) };
    const h = Math.round(PHOTO_DISPLAY_W * (gif.height / gif.width));
    return { w: PHOTO_DISPLAY_W, h };
  }, [gif]);

  // Photo-only mode: HTML table signature with the animated photo embedded.
  const photoHtml = useMemo(() => {
    return buildSignatureHtml({
      content: project.content,
      photoGif: gif?.dataUrl,
      photoWidth: photoDims.w,
      photoHeight: photoDims.h,
      logoSrc: project.content.logoSrc,
      socialIcons: icons,
      showFooter,
    });
  }, [project.content, gif, photoDims, icons, showFooter]);

  // Whole-card mode: the entire animated signature is a single GIF image.
  const cardHtml = useMemo(() => {
    if (!cardGif) return "";
    const w = Math.round(cardGif.width / 1.5);
    const h = Math.round(cardGif.height / 1.5);
    const img = `<img src="${cardGif.dataUrl}" width="${w}" height="${h}" alt="${project.content.name} email signature" style="display:block;border:0;border-radius:14px;width:${w}px;height:${h}px;" />`;
    const site = project.content.website.trim();
    return site
      ? `<a href="${/^https?:\/\//.test(site) ? site : `https://${site}`}" style="text-decoration:none;">${img}</a>`
      : img;
  }, [cardGif, project.content.name, project.content.website]);

  const html = mode === "card" ? cardHtml : photoHtml;

  const generate = async () => {
    if (!photo) return;
    setBusy(true);
    setProgress(0);
    setCopied("none");
    try {
      if (mode === "card") {
        setCardGif(null);
        const r = await exportCardGif(project, { photo, logo }, { onProgress: setProgress });
        setCardGif(r);
      } else {
        setGif(null);
        const r = await exportPhotoGif(project, photo, { onProgress: setProgress });
        setGif(r);
      }
    } catch (e) {
      alert("Could not build GIF: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    const ok = await copyRichHtml(html, buildSignatureText(project.content));
    setCopied(ok ? "rich" : "fail");
    setTimeout(() => setCopied("none"), 2500);
  };

  const downloadGif = () => {
    const res = mode === "card" ? cardGif : gif;
    if (!res) return;
    const a = document.createElement("a");
    a.href = res.url;
    a.download = mode === "card" ? "signature.gif" : "animated-photo.gif";
    a.click();
  };

  const ready = mode === "card" ? !!cardGif : !!gif;
  const activeRes = mode === "card" ? cardGif : gif;

  return (
    <div className="text-sm">
      {/* mode switch */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setMode("card")}
          className={`rounded-lg border px-3 py-2.5 text-left ${
            mode === "card"
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]"
              : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)]"
          }`}
        >
          <div className="font-medium">Whole card</div>
          <div className="text-[11px] opacity-80">Everything animates</div>
        </button>
        <button
          onClick={() => setMode("photo")}
          className={`rounded-lg border px-3 py-2.5 text-left ${
            mode === "photo"
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]"
              : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)]"
          }`}
        >
          <div className="font-medium">Photo only</div>
          <div className="text-[11px] opacity-80">Sharp, selectable text</div>
        </button>
      </div>

      <p className="text-[var(--muted)] mb-4 leading-relaxed">
        {mode === "card" ? (
          <>
            The <strong className="text-[var(--text)]">entire signature</strong>{" "}
            (logo, text and photo) is baked into one looping GIF. More motion in
            the inbox — but the text is part of the image, so it&rsquo;s softer,
            the file is larger, and links aren&rsquo;t clickable.
          </>
        ) : (
          <>
            Only the <strong className="text-[var(--text)]">photo</strong>{" "}
            animates; name, links and icons stay as crisp, clickable HTML text.
            Smaller and sharper — best for everyday email.
          </>
        )}
      </p>

      {hasPhotoZone && !project.content.photoSrc && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 px-3 py-2 mb-4">
          Upload a photo in the <strong>Content</strong> tab first.
        </p>
      )}

      <Button
        variant="primary"
        onClick={generate}
        disabled={busy || !photo}
        className="w-full mb-3"
      >
        {busy
          ? `Building… ${Math.round(progress * 100)}%`
          : ready
          ? "Rebuild GIF"
          : mode === "card"
          ? "Build animated signature"
          : "Build animated photo"}
      </Button>

      {busy && (
        <div className="h-1.5 w-full rounded-full bg-[var(--panel-2)] overflow-hidden mb-4">
          <div
            className="h-full bg-[var(--accent)]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      <div className="mb-3">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)] mb-1.5">
          Signature preview
        </span>
        <div
          className="rounded-lg border border-[var(--border)] bg-white p-4 overflow-x-auto min-h-[80px]"
          dangerouslySetInnerHTML={{ __html: html || "<span style='color:#9aa3b2;font:13px Arial'>Click Build to generate…</span>" }}
        />
        {activeRes && (
          <p className="text-[11px] text-[var(--muted)] mt-1.5">
            {activeRes.width}×{activeRes.height}px · {activeRes.frames} frames ·{" "}
            {(activeRes.bytes / 1024).toFixed(0)} KB
            {activeRes.bytes > 1024 * 1024 && (
              <span className="text-amber-400"> · over 1MB — lower quality/fps for email</span>
            )}
          </p>
        )}
      </div>

      {mode === "photo" && (
        <div className="mb-3">
          <Toggle
            label="Show “Made with” footer"
            checked={showFooter}
            onChange={setShowFooter}
          />
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <Button
          variant="primary"
          onClick={copy}
          disabled={!ready}
          className="flex-1"
        >
          {copied === "rich"
            ? "✓ Copied — paste into Gmail"
            : copied === "fail"
            ? "Copy failed"
            : "Copy signature"}
        </Button>
        {ready && <Button onClick={downloadGif}>Save GIF</Button>}
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="ghost" onClick={() => setShowSource((s) => !s)} className="px-0">
          {showSource ? "Hide HTML source" : "Show HTML source"}
        </Button>
      </div>
      {showSource && (
        <textarea
          readOnly
          value={html}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full h-40 rounded-lg bg-[var(--panel-2)] border border-[var(--border)] p-2 font-mono text-[11px] text-[var(--muted)] mb-4"
        />
      )}

      <details className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5">
        <summary className="cursor-pointer text-[var(--text)] font-medium">
          How to install it
        </summary>
        <ol className="list-decimal pl-4 mt-2 space-y-1.5 text-[var(--muted)] leading-relaxed">
          <li>Click <strong>Build</strong>, then <strong>Copy signature</strong>.</li>
          <li>
            Gmail: <em>Settings → See all settings → Signature</em>. Outlook:{" "}
            <em>Settings → Mail → Compose → Signatures</em>.
          </li>
          <li>Click into the signature box, paste (⌘/Ctrl+V), and save.</li>
        </ol>
        <p className="mt-2.5 text-[11px] text-[var(--muted)] leading-relaxed">
          The GIF is embedded inline, so paste works with no hosting step — Gmail
          re-uploads it automatically. <strong>Outlook for Windows</strong> shows
          only the first frame of any GIF; <strong>Save GIF</strong> and host it
          (imgbb.com or your domain) for full reliability there.
        </p>
      </details>
    </div>
  );
}
