import { useEffect, useState } from "react";

export type AdminViewport = "compact" | "tablet" | "desktop";

export const ADMIN_VIEWPORT_BREAKPOINTS = {
  compactMax: 767,
  tabletMax: 1023,
} as const;

export function getAdminViewport(width: number): AdminViewport {
  if (width <= ADMIN_VIEWPORT_BREAKPOINTS.compactMax) return "compact";
  if (width <= ADMIN_VIEWPORT_BREAKPOINTS.tabletMax) return "tablet";
  return "desktop";
}

/** Kept separate from useIsMobile because some modules retain their 768px layout. */
export function useAdminViewport(): AdminViewport {
  const [viewport, setViewport] = useState<AdminViewport>(() =>
    typeof window === "undefined" ? "compact" : getAdminViewport(window.innerWidth)
  );

  useEffect(() => {
    const updateViewport = () => setViewport(getAdminViewport(window.innerWidth));
    window.addEventListener("resize", updateViewport, { passive: true });
    updateViewport();
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return viewport;
}
