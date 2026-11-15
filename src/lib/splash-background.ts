/**
 * The splash background is stored in the `splash_background_url` setting.
 *
 * Newer values are JSON: `{"url": "...", "top": "#RRGGBB"}`. `top` is the colour of
 * the photo's top edge, read once when the photo is uploaded, so guests' browsers
 * don't have to read the image. Older values are a plain URL and still work.
 */
export interface SplashBackground {
  url: string | null;
  top: string | null;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function parseSplashBackground(value: string | null | undefined): SplashBackground {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { url: null, top: null };

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { url?: unknown; top?: unknown };
      return {
        url: typeof parsed.url === "string" && parsed.url ? parsed.url : null,
        top: typeof parsed.top === "string" && HEX.test(parsed.top) ? parsed.top.toUpperCase() : null,
      };
    } catch {
      return { url: null, top: null };
    }
  }

  return { url: trimmed, top: null };
}

export function serializeSplashBackground(url: string, top: string | null): string {
  return JSON.stringify({ url, top });
}
