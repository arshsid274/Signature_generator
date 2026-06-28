// Copy rich HTML (with a plain-text fallback) to the clipboard so it can be
// pasted directly into the Gmail / Outlook signature editor with formatting and
// the inline GIF intact.
export async function copyRichHtml(
  html: string,
  text: string
): Promise<boolean> {
  // Preferred path: async Clipboard API with multiple representations.
  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      navigator.clipboard &&
      "write" in navigator.clipboard
    ) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // fall through to legacy path
  }

  // Legacy fallback: select a hidden contenteditable node and execCommand copy.
  try {
    const holder = document.createElement("div");
    holder.contentEditable = "true";
    holder.innerHTML = html;
    holder.style.position = "fixed";
    holder.style.left = "-9999px";
    holder.style.top = "0";
    document.body.appendChild(holder);

    const range = document.createRange();
    range.selectNodeContents(holder);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const ok = document.execCommand("copy");
    sel?.removeAllRanges();
    document.body.removeChild(holder);
    return ok;
  } catch {
    return false;
  }
}

export async function copyPlainText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
