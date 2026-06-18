import React from "react";
import { HOME_STYLES } from "@/components/home/homeStyles";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

/* Pure layout wrapper -- no JS class toggling needed.
   html/body scroll naturally because .app-shell is never applied
   to marketing routes. See App.tsx for the split. */
const MarketingLayout = ({ children }: MarketingLayoutProps) => (
  <div
    className="nextslot-theme dark-brand scrollbar-hide"
    style={{
      background: "#000",
      overflowX: "hidden",
      WebkitFontSmoothing: "antialiased",
    } as React.CSSProperties}
  >
    <style>{HOME_STYLES}</style>
    {children}
  </div>
);

export default MarketingLayout;
