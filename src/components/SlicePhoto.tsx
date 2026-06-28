"use client";

import { useEffect, useRef, useState } from "react";
import { loadImage } from "@/lib/imageUtils";
import { getAnimation } from "@/lib/animations";
import { renderPhotoFrame } from "@/lib/renderer";
import {
  ensureSliceModel,
  getSliceModel,
  sliceAspect,
} from "@/lib/sliceReveal";
import type { AnimationOpts, PhotoStyle } from "@/lib/types";

interface Props {
  photoSrc: string;
  animationId: string;
  photoStyle: PhotoStyle;
  height: number; // display px
  durationMs: number;
  holdMs: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  replayKey: number;
}

// Live preview canvas — uses the SAME renderer the GIF export uses
// (renderPhotoFrame → the selected animation), so the preview matches the
// exported GIF frame-for-frame.
export default function SlicePhoto(props: Props) {
  const {
    photoSrc,
    animationId,
    photoStyle,
    height,
    durationMs,
    holdMs,
    zoom,
    offsetX,
    offsetY,
    replayKey,
  } = props;

  const isSlice = animationId === "slice-reveal";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optsRef = useRef<AnimationOpts>({} as AnimationOpts);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [sliceReady, setSliceReady] = useState(!isSlice || !!getSliceModel());

  // Latest framing opts available to the rAF loop without restarting it.
  optsRef.current = {
    strips: 0,
    stagger: 0,
    skew: 0,
    loop: true,
    durationMs,
    zoom,
    offsetX,
    offsetY,
  };

  // Slice-reveal needs its mask segmented before it can draw.
  useEffect(() => {
    if (!isSlice) {
      setSliceReady(true);
      return;
    }
    let alive = true;
    ensureSliceModel().then(() => alive && setSliceReady(true));
    return () => {
      alive = false;
    };
  }, [isSlice]);

  // Load the photo; clear immediately on change so the OLD photo never flashes.
  useEffect(() => {
    let alive = true;
    setImg(null);
    loadImage(photoSrc)
      .then((i) => {
        if (alive) setImg(i);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [photoSrc]);

  // Animation loop (play → hold → loop). Restarts in place on replay / speed /
  // effect / new image — no remount, no reload.
  useEffect(() => {
    if (!sliceReady || !img) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animation = getAnimation(animationId);
    const period = durationMs + holdMs;
    let raf = 0;
    let start = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = (now - start) % period;
      const t = Math.min(1, elapsed / durationMs);
      renderPhotoFrame(ctx, {
        image: img,
        photoStyle,
        animation,
        animationOpts: optsRef.current,
        width: canvas.width,
        height: canvas.height,
        t,
        background: "#ffffff",
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sliceReady, img, animationId, photoStyle, durationMs, holdMs, replayKey]);

  const dpr =
    typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const aspect = isSlice ? sliceAspect() : 0.83;
  const displayW = Math.round(height * aspect);
  const displayH = Math.round(height);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(displayW * dpr)}
      height={Math.round(displayH * dpr)}
      style={{ width: displayW, height: displayH, display: "block" }}
    />
  );
}
