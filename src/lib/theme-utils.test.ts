import { describe, expect, it } from "vitest";
import { businessThemes } from "@/data/themes";
import { getThemeVariant } from "./theme-utils";

/** "H S% L%" -> WCAG relative luminance */
function luminance(hsl: string): number {
  const [h, s, l] = hsl.replace(/%/g, "").trim().split(/\s+/).map(Number);
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const isDark = (hsl: string) => Number(hsl.split(/\s+/)[2].replace("%", "")) < 50;

describe("getThemeVariant", () => {
  it("returns the theme untouched when it is already in the requested mode", () => {
    for (const theme of businessThemes) {
      const natural = isDark(theme.colors.background) ? "dark" : "light";
      expect(getThemeVariant(theme, natural)).toBe(theme);
    }
  });

  it("flips the background to the requested mode", () => {
    for (const theme of businessThemes) {
      const target = isDark(theme.colors.background) ? "light" : "dark";
      const variant = getThemeVariant(theme, target);
      expect(isDark(variant.colors.background)).toBe(target === "dark");
      expect(variant.id).toBe(`${theme.id}-${target}`);
    }
  });

  // Every flipped theme has to stay usable: these are the pairs the booking
  // screens actually render text in.
  describe.each(businessThemes.map((theme) => [theme.id, theme] as const))("%s flipped", (_id, theme) => {
    const target = isDark(theme.colors.background) ? "light" : "dark";
    const { colors } = getThemeVariant(theme, target);

    it("keeps body text readable on the background", () => {
      expect(contrast(colors.foreground, colors.background)).toBeGreaterThanOrEqual(7);
    });

    it("keeps secondary text readable on the background", () => {
      expect(contrast(colors.mutedForeground, colors.background)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the primary button label readable", () => {
      expect(contrast(colors.primaryForeground, colors.primary)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the primary colour visible against the background", () => {
      expect(contrast(colors.primary, colors.background)).toBeGreaterThanOrEqual(3);
    });

    it("leaves the accent pair as the theme defined it", () => {
      expect(colors.accent).toBe(theme.colors.accent);
      expect(colors.accentForeground).toBe(theme.colors.accentForeground);
    });
  });
});
