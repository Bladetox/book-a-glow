import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";

/**
 * useTheme — reads the dark/light mode from the active business theme.
 * The BusinessThemeProvider already sets the dark/light class on <html>.
 * This hook exposes the current mode for components that need it.
 */
export function useTheme() {
  const { theme, allThemes, setThemeById } = useBusinessTheme();

  // Determine if current theme is dark based on background lightness
  const bgParts = theme.colors.background.split(/\s+/);
  const lightness = parseFloat(bgParts[2] ?? "50");
  const isDark = lightness < 50;

  const toggle = () => {
    // Find the opposite-mode version: pick first dark theme if currently light, or first light theme
    if (isDark) {
      const lightTheme = allThemes.find((t) => {
        const l = parseFloat(t.colors.background.split(/\s+/)[2] ?? "50");
        return l >= 50;
      });
      if (lightTheme) setThemeById(lightTheme.id);
    } else {
      const darkTheme = allThemes.find((t) => {
        const l = parseFloat(t.colors.background.split(/\s+/)[2] ?? "50");
        return l < 50;
      });
      if (darkTheme) setThemeById(darkTheme.id);
    }
  };

  return { theme: isDark ? "dark" : "light", toggle } as const;
}
