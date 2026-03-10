import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";

/**
 * useTheme — exposes the current light/dark mode and a toggle.
 * Toggle inverts the active theme's lightness in place — same hues,
 * same saturations, same accent colours. No theme switch occurs.
 */
export function useTheme() {
  const { theme, setThemeOverride } = useBusinessTheme();

  // Determine if current theme is dark based on background lightness
  const bgParts = theme.colors.background.split(/\s+/);
  const lightness = parseFloat(bgParts[2] ?? "50");
  const isDark = lightness < 50;

  const toggle = () => {
    setThemeOverride(isDark ? "light" : "dark");
  };

  return { theme: isDark ? "dark" : "light", isDark, toggle } as const;
}
