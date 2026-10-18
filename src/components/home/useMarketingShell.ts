import { useEffect } from "react";

/** Page colour of every public marketing page (matches C.bg / .nextslot-theme). */
export const MARKETING_BG = "#F5F0E7";

/**
 * Makes the browser "shell" (html/body background, iOS/Android status bar, overscroll area,
 * scrollbars) match the marketing page. Applied only while a marketing page is mounted and fully
 * undone on unmount, so it can never bleed into the admin or the public booking app.
 */
export const useMarketingShell = () => {
  useEffect(() => {
    const root = document.documentElement;
    const hadClass = root.classList.contains("marketing-page");
    root.classList.add("marketing-page");

    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", MARKETING_BG);

    return () => {
      if (!hadClass) root.classList.remove("marketing-page");
      if (meta && previous !== null) meta.setAttribute("content", previous);
    };
  }, []);
};
