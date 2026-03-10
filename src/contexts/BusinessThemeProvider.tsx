import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  BusinessTheme,
  businessThemes,
  findTheme,
  getDefaultTheme,
  getThemeCssVars,
} from "@/data/themes";
import { getThemeVariant } from "@/lib/theme-utils";
import { resolveTenantSync } from "@/lib/tenant-resolver";
import { supabase } from "@/integrations/supabase/client";

interface BusinessThemeContextValue {
  /** The currently active theme (may be a light/dark variant) */
  theme: BusinessTheme;
  /** The base theme (without light/dark override) */
  baseTheme: BusinessTheme;
  /** All available themes */
  allThemes: BusinessTheme[];
  /** Change base theme by id (for admin preview / onboarding) */
  setThemeById: (id: string) => void;
  /** Override mode to light or dark — inverts active theme in place */
  setThemeOverride: (mode: "light" | "dark") => void;
  /** Whether the theme is still loading from Supabase */
  loading: boolean;
  /** Tenant slug this app instance is scoped to */
  tenantId: string | null;
}

const BusinessThemeContext = createContext<BusinessThemeContextValue>({
  theme: getDefaultTheme(),
  baseTheme: getDefaultTheme(),
  allThemes: businessThemes,
  setThemeById: () => {},
  setThemeOverride: () => {},
  loading: false,
  tenantId: null,
});

export const useBusinessTheme = () => useContext(BusinessThemeContext);

/**
 * BusinessThemeProvider
 *
 * Resolution order:
 * 1. Supabase `tenants` table — reads theme_id for the current tenant slug
 * 2. URL param `?theme=barber` — for previewing
 * 3. localStorage fallback — for dev/testing
 * 4. Default theme (standard)
 *
 * Light/dark toggle: inverts current theme's lightness in place.
 * Same hues, same accents — only luminance flips.
 */
export const BusinessThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const resolution = resolveTenantSync();
  const tenantSlug = resolution.slug;

  const [loading, setLoading] = useState(!!tenantSlug);
  const [baseThemeId, setBaseThemeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTheme = params.get("theme");
      if (urlTheme && findTheme(urlTheme)) return urlTheme;
      const stored = localStorage.getItem("ns_business_theme");
      if (stored && findTheme(stored)) return stored;
    }
    return getDefaultTheme().id;
  });

  // null = use theme's natural mode, "light" | "dark" = user override
  const [modeOverride, setModeOverride] = useState<"light" | "dark" | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ns_theme_mode");
      if (stored === "light" || stored === "dark") return stored;
    }
    return null;
  });

  // Fetch theme_id from Supabase for the resolved tenant
  useEffect(() => {
    if (!tenantSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("tenants")
      .select("theme_id")
      .eq("id", tenantSlug)
      .eq("is_active", true)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.theme_id) {
          const found = findTheme(data.theme_id);
          if (found) {
            setBaseThemeId(found.id);
            localStorage.setItem("ns_business_theme", found.id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  const baseTheme = useMemo(
    () => findTheme(baseThemeId) ?? getDefaultTheme(),
    [baseThemeId]
  );

  // Apply mode override (light/dark) by inverting base theme lightness in place
  const theme = useMemo(() => {
    if (!modeOverride) return baseTheme;
    return getThemeVariant(baseTheme, modeOverride);
  }, [baseTheme, modeOverride]);

  const cssVars = useMemo(() => getThemeCssVars(theme), [theme]);

  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    const bgParts = theme.colors.background.split(/\s+/);
    const lightness = parseFloat(bgParts[2] ?? "50");
    if (lightness < 50) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [cssVars, theme]);

  // Persist base theme id
  useEffect(() => {
    localStorage.setItem("ns_business_theme", baseThemeId);
  }, [baseThemeId]);

  const setThemeById = useCallback((id: string) => {
    if (findTheme(id)) {
      setBaseThemeId(id);
      // Reset mode override when base theme changes
      setModeOverride(null);
      localStorage.removeItem("ns_theme_mode");
    }
  }, []);

  const setThemeOverride = useCallback((mode: "light" | "dark") => {
    setModeOverride(mode);
    localStorage.setItem("ns_theme_mode", mode);
  }, []);

  return (
    <BusinessThemeContext.Provider
      value={{
        theme,
        baseTheme,
        allThemes: businessThemes,
        setThemeById,
        setThemeOverride,
        loading,
        tenantId: tenantSlug,
      }}
    >
      {children}
    </BusinessThemeContext.Provider>
  );
};
