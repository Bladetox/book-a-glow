import React, { useEffect } from "react";
import { HOME_STYLES } from "@/components/home/homeStyles";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

const MarketingLayout = ({ children }: MarketingLayoutProps) => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    html.style.overflow = "auto";
    html.style.height = "auto";
    body.style.overflow = "auto";
    body.style.height = "auto";
    if (root) {
      root.style.overflow = "auto";
      root.style.height = "auto";
    }

    return () => {
      html.style.overflow = "";
      html.style.height = "";
      body.style.overflow = "";
      body.style.height = "";
      if (root) {
        root.style.overflow = "";
        root.style.height = "";
      }
    };
  }, []);

  return (
    <div className="nextslot-theme dark-brand" style={{ overflowX: "hidden", minHeight: "100vh" }}>
      <style>{HOME_STYLES}</style>
      {children}
    </div>
  );
};

export default MarketingLayout;
