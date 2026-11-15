import { useEffect, useState } from "react";

/**
 * Samples the colour of an image's top edge, as a CSS hex string.
 *
 * Used so the browser's top bar can blend into a splash photo that is drawn
 * from its top edge. Returns null when there is no image, while it loads, or
 * when the image cannot be read (for example a cross-origin image without CORS
 * headers), so callers can fall back to the theme colour.
 */
export function useImageEdgeColor(url: string | null | undefined): string | null {
  const [edge, setEdge] = useState<string | null>(null);

  useEffect(() => {
    setEdge(null);
    if (!url) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const width = Math.min(img.naturalWidth, 64);
        if (width === 0) return;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, img.naturalWidth, 1, 0, 0, width, 1);
        const pixels = ctx.getImageData(0, 0, width, 1).data;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
        }
        const count = pixels.length / 4;
        const hex = (v: number) => Math.round(v / count).toString(16).padStart(2, "0");
        setEdge(`#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase());
      } catch {
        // Tainted or unreadable image: keep the theme colour.
        setEdge(null);
      }
    };
    img.onerror = () => {
      if (!cancelled) setEdge(null);
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return edge;
}
