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
        position: "absolute",
        inset: 0,
        overflowY: "scroll",
        overflowX: "hidden",
        background: "#000",
        WebkitFontSmoothing: "antialiased",
      } as React.CSSProperties}
    >
      <style>{HOME_STYLES}</style>
      {children}
    </div>
  );
};

export default MarketingLayout;
