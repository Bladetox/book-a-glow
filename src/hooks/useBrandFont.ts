import { useEffect, useState } from "react";

/**
 * Injects a brand font stylesheet into <head> for the current tenant.
 * Returns { fontFamily } — the CSS font-family string to apply, or null if
 * no brand font is configured.
 *
 * This is a no-op (returns null) for every tenant that has not set
 * brand_font_url in app_settings, so it is safe to call everywhere.
 *
 * Cleans up the <link> tag on unmount to prevent bleed between tenants.
 */
export function useBrandFont(brandFontUrl: string | null): string | null {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!brandFontUrl) return;
    const id = "brand-font-link";

    if (document.getElementById(id)) {
      setLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.id   = id;
    link.rel  = "stylesheet";
    link.href = brandFontUrl;
    link.onload  = () => setLoaded(true);
    link.onerror = () => setLoaded(true); // graceful fallback
    document.head.appendChild(link);

    return () => {
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, [brandFontUrl]);

  if (!brandFontUrl || !loaded) return null;

  // Extract family name from Google/Bunny Fonts CSS2 URL:
  // e.g. ?family=Cinzel+Decorative  →  "Cinzel Decorative"
  // e.g. ?family=Cinzel+Decorative:wght@700  →  "Cinzel Decorative"
  const match = brandFontUrl.match(/family=([^:&]+)/);
  if (!match) return null;
  return `'${decodeURIComponent(match[1].replace(/\+/g, " "))}', serif`;
}
