import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  BusinessTheme,
  businessThemes,
  findTheme,
  getDefaultTheme,
  getThemeCssVars,
} from "@/data/themes";
import { supabase } from "@/integrations/supabase/client";
import { getTenantSlug, isCustomDomainHost } from "@/lib/tenant-resolver";

interface BusinessThemeContextValue {
  /** The currently active theme */
  theme: BusinessTheme;
  /** All available themes */
  allThemes: BusinessTheme[];
  /** Change theme locally (for admin preview / testing) */
  setThemeById: (id: string) => void;
  /** Whether the theme is still loading from Supabase */
  loading: boolean;
  /** Business ID this app instance is scoped to */
  businessId: string | null;
}

const BusinessThemeContext = createContext<BusinessThemeContextValue>({
  theme: getDefaultTheme(),
  allThemes: businessThemes,
  setThemeById: () => {},
  loading: false,
  businessId: null,
});

export const useBusinessTheme = () => useContext(BusinessThemeContext);

/**
 * BusinessThemeProvider
 * 
 * Wraps the client-facing app and dynamically applies CSS variables
 * based on the business's selected theme.
 * 
 * Resolution order:
 * 1. Supabase `businesses` table (by business_id) — when connected
 * 2. URL param `?theme=barber` — for previewing
 * 3. localStorage fallback — for dev/testing
 * 4. Default theme (beautician)
 */
export const BusinessThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    // Check URL param first
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTheme = params.get("theme");
      if (urlTheme && findTheme(urlTheme)) return urlTheme;

      const urlBizId = params.get("business_id");
      if (urlBizId) setBusinessId(urlBizId);

      // Check localStorage
      const stored = localStorage.getItem("ns_business_theme");
      if (stored && findTheme(stored)) return stored;
    }
    return getDefaultTheme().id;
  });

  const theme = useMemo(
    () => findTheme(activeThemeId) ?? getDefaultTheme(),
    [activeThemeId]
  );

  const cssVars = useMemo(() => getThemeCssVars(theme), [theme]);

  // Apply CSS variables to document root for global effect
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Determine if theme is "dark" based on background lightness
    const bgParts = theme.colors.background.split(/\s+/);
    const lightness = parseFloat(bgParts[2] ?? "50");
    if (lightness < 50) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }

    return () => {
      // Cleanup is handled by the next theme application
    };
  }, [cssVars, theme]);

  // Persist selection
  useEffect(() => {
    localStorage.setItem("ns_business_theme", activeThemeId);
  }, [activeThemeId]);

  // Fetch theme from Supabase based on current tenant
  useEffect(() => {
    const fetchTenantTheme = async () => {
      try {
        const tenantSlug = getTenantSlug();
        const customDomainHost = isCustomDomainHost();

        let tenantId: string | null = null;

        if (tenantSlug) {
          tenantId = tenantSlug;
        } else if (customDomainHost) {
          const { data } = await supabase
            .from("tenants")
            .select("id")
            .eq("custom_domain", customDomainHost)
            .eq("is_active", true)
            .single();
          tenantId = data?.id ?? null;
        }

        if (!tenantId) return;

        setLoading(true);
        const { data } = await supabase
          .from("tenants")
          .select("theme_id")
          .eq("id", tenantId)
          .eq("is_active", true)
          .single();

        if (data?.theme_id && findTheme(data.theme_id)) {
          setActiveThemeId(data.theme_id);
        }
      } catch {
        // Silently fallback to default/stored theme
      } finally {
        setLoading(false);
      }
    };

    fetchTenantTheme();
  }, []);

  const setThemeById = (id: string) => {
    if (findTheme(id)) {
      setActiveThemeId(id);
    }
  };

  return (
    <BusinessThemeContext.Provider
      value={{ theme, allThemes: businessThemes, setThemeById, loading, businessId }}
    >
      {children}
    </BusinessThemeContext.Provider>
  );
};
