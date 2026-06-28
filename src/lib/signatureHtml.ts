import type { Content } from "./types";

// Escape user text for safe inclusion in HTML.
function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeUrl(u: string): string {
  const t = (u || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return "https://" + t;
}

export interface BuildSignatureOpts {
  content: Content;
  photoGif?: string; // data URL (or hosted URL) of the animated photo
  photoWidth?: number; // display px
  photoHeight?: number;
  logoSrc?: string; // data URL of the logo
  socialIcons?: Record<string, string>; // key -> icon data URL
  photoSide?: "left" | "right";
  showFooter?: boolean;
}

// Vertical column of social icons inside its own bordered, rounded box —
// mirrors the reference (customesignature) layout.
function socialColumn(
  content: Content,
  icons: Record<string, string>
): string {
  const rows: string[] = [];

  const push = (href: string, iconKey: string, label: string) => {
    const src = icons[iconKey];
    if (!src || !href) return;
    rows.push(
      `<tr><td style="padding:5px 0 0 0;"><a href="${esc(
        href
      )}" target="_blank" style="text-decoration:none;"><img src="${src}" width="24" height="24" alt="${esc(
        label
      )}" style="display:block;border:0;border-radius:6px;" /></a></td></tr>`
    );
  };

  if (content.website.trim())
    push(normalizeUrl(content.website), "website", "Website");
  for (const s of content.socials) {
    if (s.url.trim()) push(normalizeUrl(s.url), s.type, s.type);
  }

  if (rows.length === 0) return "";

  return `<td align="left" valign="top" style="border:1px solid #e2e2e2;border-radius:5px;padding:3px 8px 8px 8px;">
    <table border="0" cellspacing="0" cellpadding="0" role="presentation"><tbody>${rows.join(
      ""
    )}</tbody></table>
  </td>
  <td style="width:20px;font-size:1px;line-height:1px;">&nbsp;</td>`;
}

function detailsColumn(content: Content, logoSrc?: string): string {
  const c = content;
  const black = "#000000";
  const line = (html: string, pad = "0") =>
    `<tr><td style="padding:${pad};font-family:Arial,Helvetica,sans-serif;" nowrap>${html}</td></tr>`;

  const parts: string[] = [];

  if (logoSrc) {
    parts.push(
      `<tr><td style="padding:0 0 10px 0;"><img src="${logoSrc}" width="120" alt="${esc(
        c.company
      )}" style="display:block;border:0;max-width:120px;height:auto;" /></td></tr>`
    );
  }

  parts.push(
    line(
      `<span style="font-weight:bold;color:${black};font-size:16px;">${esc(
        c.name
      )}</span>`
    )
  );
  if (c.title)
    parts.push(
      line(
        `<span style="color:${black};font-size:12px;">${esc(c.title)}</span>`,
        "2px 0 0 0"
      )
    );
  if (c.company)
    parts.push(
      line(
        `<span style="font-weight:bold;color:${black};font-size:12px;">${esc(
          c.company
        )}</span>`,
        "2px 0 6px 0"
      )
    );
  if (c.phone)
    parts.push(
      line(
        `<a href="tel:${esc(
          c.phone.replace(/\s+/g, "")
        )}" style="text-decoration:none;color:${black};font-size:12px;">${esc(
          c.phone
        )}</a>`,
        "1px 0 0 0"
      )
    );
  if (c.email)
    parts.push(
      line(
        `<a href="mailto:${esc(
          c.email
        )}" style="text-decoration:none;color:${black};font-size:12px;">${esc(
          c.email
        )}</a>`,
        "1px 0 0 0"
      )
    );
  if (c.website)
    parts.push(
      line(
        `<a href="${esc(
          normalizeUrl(c.website)
        )}" style="text-decoration:none;color:${esc(
          c.accent
        )};font-size:12px;">${esc(c.website)}</a>`,
        "1px 0 0 0"
      )
    );

  return `<td align="left" valign="middle" style="font-family:Arial,Helvetica,sans-serif;line-height:1.35;">
    <table border="0" cellspacing="0" cellpadding="0" role="presentation"><tbody>${parts.join(
      ""
    )}</tbody></table>
  </td>`;
}

function photoColumn(opts: BuildSignatureOpts): string {
  if (!opts.photoGif) return "";
  const w = opts.photoWidth ?? 140;
  const h = opts.photoHeight ?? Math.round(w * 1.2);
  return `<td style="width:20px;font-size:1px;line-height:1px;">&nbsp;</td>
  <td align="left" valign="middle">
    <img src="${opts.photoGif}" width="${w}" height="${h}" alt="${esc(
    opts.content.name
  )}" style="display:inline-block;border:0;border-radius:10px;width:${w}px;height:${h}px;object-fit:cover;" />
  </td>`;
}

function footer(): string {
  return `<tr><td align="center" style="background:#f2f2f2;border-radius:0 0 5px 5px;padding:9px 10px;font-family:Arial,Helvetica,sans-serif;">
    <span style="font-size:11px;color:#8a8a8a;">Made with <strong style="color:#000;">Animated Signature Studio</strong></span>
  </td></tr>`;
}

// Build a table-based, email-client-safe signature card in the reference style:
// a bordered rounded card with a left social-icon column, centre details, and
// the animated photo on the right; optional footer bar.
export function buildSignatureHtml(opts: BuildSignatureOpts): string {
  const { content } = opts;
  const icons = opts.socialIcons ?? {};
  const side = opts.photoSide ?? "right";

  const social = socialColumn(content, icons);
  const details = detailsColumn(content, opts.logoSrc);
  const photo = photoColumn(opts);

  const middleAndPhoto =
    side === "left" ? `${photo}${details}` : `${details}${photo}`;

  const cardInner = `<table border="0" cellspacing="0" cellpadding="0" role="presentation" style="border-collapse:separate;"><tbody>
    <tr>${social}${middleAndPhoto}</tr>
  </tbody></table>`;

  const cardRow = `<tr><td align="left" valign="top" style="border:1px solid #e2e2e2;border-radius:${
    opts.showFooter ? "5px 5px 0 0" : "5px"
  };padding:15px;">${cardInner}</td></tr>`;

  return `<table class="signature_tbl" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">
  <tbody>
    ${cardRow}
    ${opts.showFooter ? footer() : ""}
  </tbody>
</table>`;
}

// Plain-text fallback for the clipboard.
export function buildSignatureText(content: Content): string {
  return [
    content.name,
    [content.title, content.company].filter(Boolean).join(", "),
    content.phone,
    content.email,
    content.website,
  ]
    .filter(Boolean)
    .join("\n");
}
