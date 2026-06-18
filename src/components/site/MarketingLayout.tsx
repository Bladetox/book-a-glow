import React, { useEffect } from "react";
import { HOME_STYLES } from "@/components/home/homeStyles";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

const MarketingLayout = ({ children }: MarketingLayoutProps) => {
  useEffect(() => {
    document.documentElement.classList.add("marketing-page");
    return () => document.documentElement.classList.remove("marketing-page");
  }, []);

  return (
    <div
      className="nextslot-theme dark-brand scrollbar-hide"
      style={{
        minHeight: "100dvh",
        background: "#000",
        overflowX: "hidden",
        WebkitFontSmoothing: "antialiased",
      } as React.CSSProperties}
    >
      <style>{HOME_STYLES}</style>
      {children}
    </div>
  );
};

export default MarketingLayout;
