import { useEffect } from "react";

interface TenantHeadOptions {
  name: string;
  logoUrl: string | null;
  loading: boolean;
}

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

    const swapIcon = (selector: string) => {
      const el = document.querySelector(selector) as HTMLLinkElement | null;
      if (el) el.href = image;
    };

    document.title = title;

    setMeta('meta[name="description"]',                "content", description);
    setMeta('meta[name="apple-mobile-web-app-title"]', "content", name);
    setMeta('meta[property="og:title"]',               "content", title);
    setMeta('meta[property="og:description"]',         "content", description);
    setMeta('meta[property="og:site_name"]',           "content", name);
    if (image) setMeta('meta[property="og:image"]',    "content", image);
    setMeta('meta[name="twitter:title"]',              "content", title);
    setMeta('meta[name="twitter:description"]',        "content", description);
    if (image) setMeta('meta[name="twitter:image"]',   "content", image);

    // Swap favicon and apple touch icon to tenant logo
    if (image) {
      swapIcon('link[rel="icon"][type="image/png"]');
      swapIcon('link[rel="icon"][type="image/svg+xml"]');
      swapIcon('link[rel="shortcut icon"]');
      swapIcon('link[rel="apple-touch-icon"]');
    }

    return () => {
      document.title = prevTitle;
    };
  }, [name, logoUrl, loading]);
}
