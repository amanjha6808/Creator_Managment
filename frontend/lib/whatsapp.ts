/**
 * Open WhatsApp natively without navigating the current page away.
 *
 * - Mobile  → uses the `whatsapp://` deep-link scheme → OS hands off to the native app.
 * - Desktop → opens a small `wa.me` popup → the desktop app (if installed) intercepts it;
 *             otherwise WhatsApp Web loads inside the popup only.
 *
 * In both cases the current tab stays untouched.
 */
export function openWhatsApp(
  phone: string,
  text?: string,
): void {
  const clean = phone.replace(/\D/g, "");
  if (!clean) return;

  const params = text ? `?text=${encodeURIComponent(text)}` : "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Deep-link to the native app — the OS intercepts `whatsapp://`
    window.open(`whatsapp://send?phone=${clean}${params}`, "_blank");
  } else {
    // Small popup — the desktop app registers as a handler for `wa.me`.
    // If the user has it installed, the URL gets handed off silently.
    // Otherwise WhatsApp Web loads inside this popup, not the main tab.
    window.open(
      `https://wa.me/${clean}${params}`,
      "whatsapp-popup",
      "width=540,height=640,menubar=no,toolbar=no,location=no",
    );
  }
}

/** Detect whether the current device supports `whatsapp://` deep-links. */
export function supportsNativeWhatsApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
