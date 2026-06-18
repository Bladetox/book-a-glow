import { HOME_STYLES } from "@/components/home/homeStyles";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

const MarketingLayout = ({ children }: MarketingLayoutProps) => (
  <div className="nextslot-theme dark-brand" style={{ overflowX: "hidden" }}>
    <style>{HOME_STYLES}</style>
    {children}
  </div>
);

export default MarketingLayout;
