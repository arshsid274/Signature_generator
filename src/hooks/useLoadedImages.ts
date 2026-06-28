"use client";

import { useEffect, useState } from "react";
import { loadImage } from "@/lib/imageUtils";

// Turn photo/logo data-URLs into decoded HTMLImageElements for the canvas.
export function useLoadedImages(photoSrc?: string, logoSrc?: string) {
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let alive = true;
    if (!photoSrc) {
      setPhoto(null);
      return;
    }
    loadImage(photoSrc)
      .then((img) => alive && setPhoto(img))
      .catch(() => alive && setPhoto(null));
    return () => {
      alive = false;
    };
  }, [photoSrc]);

  useEffect(() => {
    let alive = true;
    if (!logoSrc) {
      setLogo(null);
      return;
    }
    loadImage(logoSrc)
      .then((img) => alive && setLogo(img))
      .catch(() => alive && setLogo(null));
    return () => {
      alive = false;
    };
  }, [logoSrc]);

  return { photo, logo };
}
