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
 * Returns true when the current pathname is an admin route.
 * On admin routes the provider acts as a passthrough — no CSS vars,
 * no fonts, no dark/light classes are written to document.documentElement.
 * The admin shell owns its own visual tokens entirely.
 */
const ADMIN_PATH_PREFIXES = ["/admin", "/superadmin"];

function isAdminPath(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return ADMIN_PATH_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(prefix + "/")
  );
}

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
 *
 * Font resolution (via CSS variables --font-display / --font-body):
 * - phenomebeauty + sister-studios → Abril Fatface (display) + Montserrat (body)
 * - zo-beauty-bar                  → Cormorant Garamond (display) + Montserrat (body)
 * - all other tenants + marketing  → Inter (display + body)
 *
 * NOTE: On /admin and /superadmin routes this provider is a passthrough.
 * No CSS vars, fonts, or dark/light classes are applied to :root so the
 * admin shell's own Tailwind tokens remain fully in control.
 */
export const BusinessThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const resolution = resolveTenantSync();
  const tenantSlug = resolution.slug;
  const adminPath = isAdminPath();

  // On admin routes skip loading entirely — provider is passthrough
  const [loading, setLoading] = useState(!adminPath && !!tenantSlug);
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
  // Skipped entirely on admin routes
  useEffect(() => {
    if (adminPath) return;
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
  }, [tenantSlug, adminPath]);

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

  // Apply CSS colour variables + dark/light class to document root
  // Skipped entirely on admin routes — admin shell owns :root tokens
  useEffect(() => {
    if (adminPath) return;
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
  }, [cssVars, theme, adminPath]);

  // Apply tenant-specific fonts via CSS variables
  // Skipped entirely on admin routes
  useEffect(() => {
    if (adminPath) return;
    const root = document.documentElement;

    // Default: Inter for all tenants and marketing site
    let fontDisplay = "Inter, system-ui, sans-serif";
    let fontBody    = "Inter, system-ui, sans-serif";

    if (tenantSlug === "phenomebeauty" || tenantSlug === "sister-studios") {
      // Phenomebeauty & Sister Studios — preserve existing brand typography
      fontDisplay = '"Abril Fatface", system-ui, serif';
      fontBody    = "Montserrat, system-ui, sans-serif";
    } else if (tenantSlug === "zo-beauty-bar") {
      // Zo Beauty Bar — elegant serif headings + clean sans body (matches menu branding)
      fontDisplay = '"Cormorant Garamond", system-ui, serif';
      fontBody    = "Montserrat, system-ui, sans-serif";
    }

    root.style.setProperty("--font-display", fontDisplay);
    root.style.setProperty("--font-body", fontBody);
  }, [tenantSlug, adminPath]);

  // Persist base theme id — skipped on admin routes
  useEffect(() => {
    if (adminPath) return;
    localStorage.setItem("ns_business_theme", baseThemeId);
  }, [baseThemeId, adminPath]);

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
