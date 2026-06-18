import React from "react";
import { HOME_STYLES } from "@/components/home/homeStyles";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

const MarketingLayout = ({ children }: MarketingLayoutProps) => {
  return (
    <div
      className="nextslot-theme dark-brand scrollbar-hide"
style={{
  position: "fixed",
  inset: 0,
  overflowY: "scroll",
  overflowX: "hidden",
  background: "#000",
  WebkitFontSmoothing: "antialiased",
  paddingTop: "env(safe-area-inset-top)",
  paddingBottom: "env(safe-area-inset-bottom)",
  paddingLeft: "env(safe-area-inset-left)",
  paddingRight: "env(safe-area-inset-right)",
} as React.CSSProperties}
    >
      <style>{HOME_STYLES}</style>
      {children}
    </div>
  );
};

export default MarketingLayout;
