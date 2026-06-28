"use client";

import React from "react";
import { SOCIAL_ICON, VerifiedBadge } from "./icons";
import SlicePhoto from "./SlicePhoto";
import type { PhotoStyle } from "@/lib/types";
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
  animationId?: string;
  photoStyle?: PhotoStyle;
  durationMs?: number;
  holdMs?: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  replayKey?: number;
  selected?: boolean;
}

// Fixed internal design size — the card scales down to fit its container.
const PHOTO_H = 250;

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
    animationId = "slice-reveal",
    photoStyle = "full-bleed",
    durationMs = 2600,
    holdMs = 1000,
    zoom = 1,
    offsetX = 0,
    offsetY = 0,
    replayKey = 0,
    selected = false,
  } = props;

  const durSec = durationMs / 1000 + 1; // text fade loop, with an end-hold

  // The social icon column: website first (globe), then each filled social link.
  const iconItems: { type: string; url: string }[] = [];
  if (website.trim()) iconItems.push({ type: "website", url: website });
  for (const s of socials) if (s.url.trim()) iconItems.push(s);

  return (
    <div
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

      {/* right — animated sliced photo (pixel-exact slice-reveal) */}
      <div className="sig-photo-area">
        {photoSrc ? (
          <SlicePhoto
            photoSrc={photoSrc}
            animationId={animationId}
            photoStyle={photoStyle}
            height={PHOTO_H}
            durationMs={durationMs}
            holdMs={holdMs}
            zoom={zoom}
            offsetX={offsetX}
            offsetY={offsetY}
            replayKey={replayKey}
          />
        ) : (
          <div
            className="sig-photo-empty"
            style={{ width: Math.round(PHOTO_H * 1.14), height: PHOTO_H }}
          >
            Upload a photo
          </div>
        )}
      </div>

    </div>
  );
}
