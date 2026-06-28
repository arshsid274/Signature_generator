"use client";

import React, { useMemo } from "react";
import { SOCIAL_ICON, VerifiedBadge } from "./icons";
import "./SignatureCard.css";

export interface SignatureCardProps {
  name: string;
  title: string;
  company: string;
  email: string;
  website: string;
  phone?: string;
  photoSrc?: string;
  logoSrc?: string;
  accent: string;
  verified: boolean;
  socials: { type: string; url: string }[];
  // animation tuning
  strips?: number;
  skew?: number; // degrees
  stagger?: number; // 0–1
  durationMs?: number;
  replayKey?: number;
  selected?: boolean;
}

// Fixed internal design size — the card scales down to fit its container.
const PHOTO_W = 250;
const PHOTO_H = 300;
const GAP = 6; // thin white gap between slices

export default function SignatureCard(props: SignatureCardProps) {
  const {
    name,
    title,
    company,
    email,
    website,
    photoSrc,
    logoSrc,
    accent,
    verified,
    socials,
    strips = 4,
    skew = 18,
    stagger = 0.5,
    durationMs = 1600,
    replayKey = 0,
    selected = false,
  } = props;

  const n = Math.max(2, Math.round(strips));
  const skewPx = Math.min(80, (skew / 40) * 70);
  const wrapW = PHOTO_W + skewPx;
  const durSec = durationMs / 1000 + 1; // include an end-hold before the loop
  const staggerSec = stagger * 0.4;

  // Pre-compute the parallelogram clip-path for each diagonal slice.
  const bands = useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const L = (i / n) * PHOTO_W;
      const R = ((i + 1) / n) * PHOTO_W;
      const clip = `polygon(${L + skewPx + GAP}px 0, ${R + skewPx}px 0, ${R}px ${PHOTO_H}px, ${L + GAP}px ${PHOTO_H}px)`;
      return { i, clip };
    });
  }, [n, skewPx]);

  // The social icon column: website first (globe), then each filled social link.
  const iconItems: { type: string; url: string }[] = [];
  if (website.trim()) iconItems.push({ type: "website", url: website });
  for (const s of socials) if (s.url.trim()) iconItems.push(s);

  return (
    <div
      key={replayKey}
      className={`sig-card${selected ? " sig-selected" : ""}`}
      style={{ ["--sig-dur" as string]: `${durSec}s` }}
    >
      {/* left — social icon column */}
      {iconItems.length > 0 && (
        <div className="sig-icons">
          {iconItems.map((s, i) => {
            const Icon = SOCIAL_ICON[s.type] ?? SOCIAL_ICON.website;
            return (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="sig-icon"
              >
                <Icon size={22} color="#0f0f10" />
              </a>
            );
          })}
        </div>
      )}

      {/* middle — details */}
      <div className="sig-details">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt={company} className="sig-logo" />
        ) : (
          <div className="sig-wordmark" style={{ color: accent }}>
            {company || "Company"}
          </div>
        )}

        <div className="sig-name-row">
          <span className="sig-name">{name || "Your Name"}</span>
          {verified && <VerifiedBadge size={22} />}
        </div>
        {title && <div className="sig-title">{title}</div>}

        <div className="sig-block">
          {company && <div className="sig-company">{company}</div>}
          {props.phone && (
            <a href={`tel:${props.phone.replace(/\s+/g, "")}`} className="sig-link">
              {props.phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="sig-link">
              {email}
            </a>
          )}
          {website && (
            <a
              href={/^https?:\/\//.test(website) ? website : `https://${website}`}
              target="_blank"
              rel="noreferrer"
              className="sig-link sig-web"
              style={{ color: accent }}
            >
              {website}
            </a>
          )}
        </div>
      </div>

      {/* right — animated sliced photo */}
      <div className="sig-photo-area" style={{ width: wrapW + 80 }}>
        {/* decorative gray parallelograms */}
        <span className="deco deco1" />
        <span className="deco deco2" />
        <span className="deco deco3" />

        {photoSrc ? (
          <div className="sig-photo" style={{ width: wrapW, height: PHOTO_H }}>
            {/* gray placeholder slots (always visible behind the photo) */}
            {bands.map((b) => (
              <span
                key={`slot-${b.i}`}
                className="slot"
                style={{ clipPath: b.clip }}
              />
            ))}
            {/* photo slices that animate in */}
            {bands.map((b) => (
              <span
                key={`strip-${b.i}`}
                className="strip"
                style={{
                  clipPath: b.clip,
                  backgroundImage: `url(${photoSrc})`,
                  backgroundSize: `${wrapW}px ${PHOTO_H}px`,
                  animationDelay: `${(b.i * staggerSec).toFixed(2)}s`,
                  animationDuration: `${durSec}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="sig-photo-empty" style={{ width: wrapW, height: PHOTO_H }}>
            Upload a photo
          </div>
        )}
      </div>

    </div>
  );
}
