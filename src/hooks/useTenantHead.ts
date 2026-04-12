import { useEffect } from "react";

interface TenantHeadOptions {
  name: string;
  logoUrl: string | null;
  loading: boolean;
}

/**
 * Patches <head> metadata to reflect the current tenant rather than NextSlot.
 * Called once inside Book.tsx after config has resolved.
 */
export function useTenantHead({ name, logoUrl, loading }: TenantHeadOptions) {
  useEffect(() => {
    if (loading || !name) return;

    const title = `${name} | Book Online`;
    const description = `Book your appointment with ${name}. Powered by NextSlot.`;
    const image = logoUrl ?? "";

    const prevTitle = document.title;

    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector) as HTMLMetaElement | null;
      if (el) el.setAttribute(attr, value);
    };

    document.title = title;

    setMeta('meta[name="description"]',                "content", description);
    setMeta('meta[name="apple-mobile-web-app-title"]', "content", name);

    setMeta('meta[property="og:title"]',               "content", title);
    setMeta('meta[property="og:description"]',         "content", description);
    if (image) setMeta('meta[property="og:image"]',    "content", image);

    setMeta('meta[name="twitter:title"]',              "content", title);
    setMeta('meta[name="twitter:description"]',        "content", description);
    if (image) setMeta('meta[name="twitter:image"]',   "content", image);

    // Swap the PWA manifest to a data URI so the "Add to Home Screen" prompt
    // shows the tenant name and logo instead of NextSlot.
    const manifestPayload: Record<string, unknown> = {
      name,
      short_name: name,
      description,
      start_url: window.location.pathname,
      display: "standalone",
      background_color: "#080808",
      theme_color: "#080808",
    };
    if (image) {
      manifestPayload.icons = [
        { src: image, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: image, sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ];
    }

    const blob = new Blob([JSON.stringify(manifestPayload)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevManifest = manifestLink?.href ?? null;
    if (manifestLink) manifestLink.href = blobUrl;

    return () => {
      document.title = prevTitle;
      URL.revokeObjectURL(blobUrl);
      if (manifestLink && prevManifest) manifestLink.href = prevManifest;
    };
  }, [name, logoUrl, loading]);
}
