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
