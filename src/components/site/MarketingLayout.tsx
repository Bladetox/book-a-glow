import { HOME_STYLES } from "@/components/home/homeStyles";
import { C, FONT_BODY } from "@/components/home/tokens";
import type { ReactNode } from "react";

/**
 * MarketingLayout
 *
 * Shared scroll container for all marketing/site pages.
 *
 * Why position:absolute + inset:0 + overflowY:scroll?
 * html, body, and #root all have overflow:hidden so the browser
 * never scrolls the document. Every marketing page needs its own
 * independent scroll container that fills the viewport. This is
 * the same pattern used by Index.tsx.
 *
 * The explicit background:#000 on the wrapper kills the white
 * safe-area/overscroll bleed that appears on iOS and wide displays
 * when .nextslot-theme sets background:hsl(var(--background)).
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="nextslot-theme dark-brand scrollbar-hide"
      style={{
        position: "absolute",
        inset: 0,
        overflowY: "scroll",
        overflowX: "hidden",
        background: C.bg,
        color: C.text,
        fontFamily: FONT_BODY,
        WebkitFontSmoothing: "antialiased",
      } as React.CSSProperties}
    >
      <style>{HOME_STYLES}</style>
      {children}
    </div>
  );
}
