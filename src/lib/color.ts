/**
 * Converts a theme colour stored as "H S% L%" (for example "35 45% 92%") to a
 * hex string such as "#F4ECE1".
 *
 * Browser chrome (the status bar and toolbar tint, `theme-color`) takes hex
 * colours reliably, so the shell uses hex rather than hsl() strings.
 */
export function hslStringToHex(hsl: string): string {
  const [hueRaw, satRaw, lightRaw] = hsl.trim().split(/\s+/);
  const h = parseFloat(hueRaw) || 0;
  const s = (parseFloat(satRaw) || 0) / 100;
  const l = (parseFloat(lightRaw) || 0) / 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(channel(0))}${toHex(channel(8))}${toHex(channel(4))}`.toUpperCase();
}

/**
 * True when a hex colour is light (for example "#F2C1BB"), using perceived
 * brightness. Used to pick the browser's colour scheme from the colour it shows.
 */
export function isLightHex(hex: string): boolean {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return false;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150;
}
