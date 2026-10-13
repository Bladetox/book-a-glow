import React from "react";
import { HOME_STYLES } from "@/components/home/homeStyles";
import { useMarketingShell } from "@/components/home/useMarketingShell";

interface MarketingLayoutProps { children: React.ReactNode; }

/* Shared warm-light theme for public marketing routes. */
const MarketingLayout = ({ children }: MarketingLayoutProps) => {
  useMarketingShell();
  return (
    <div className="nextslot-theme marketing-light scrollbar-hide marketing-layout">
      <style>{HOME_STYLES}</style>
      {children}
    </div>
  );
};
export default MarketingLayout;
