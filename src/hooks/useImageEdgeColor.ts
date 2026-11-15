import { useEffect, useState } from "react";

/**
 * Reads the average colour of an image's top row, as a hex string.
 * Resolves null when the image cannot be loaded or read.
 */
export function sampleTopEdgeColor(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Only ask for CORS for images on another origin. A same-origin request with
    // crossOrigin set can be answered differently by the service worker, which
    // then makes the canvas unreadable.
    let sameOrigin = true;
    try {
      sameOrigin = new URL(src, window.location.href).origin === window.location.origin;
    } catch {
      sameOrigin = true;
    }
    if (!sameOrigin) img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const width = Math.min(img.naturalWidth, 64);
        if (width === 0) return resolve(null);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
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
        resolve(`#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase());
      } catch {
        // Tainted or unreadable image.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Guest-side fallback: samples the top edge of the splash photo when the stored
 * colour is missing (for example photos uploaded before colours were stored).
 */
export function useImageEdgeColor(url: string | null | undefined): string | null {
  const [edge, setEdge] = useState<string | null>(null);

  useEffect(() => {
    setEdge(null);
    if (!url) return;
    let cancelled = false;
    sampleTopEdgeColor(url).then((hex) => {
      if (!cancelled) setEdge(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return edge;
}
