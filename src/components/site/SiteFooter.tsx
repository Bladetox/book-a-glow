import { Link } from "react-router-dom";
import { C, FONT_BODY } from "@/components/home/tokens";

const SiteFooter = () => (
  <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-5 md:gap-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/web-app-manifest-192x192.png" alt="NextSlot logo" className="h-8 w-8 object-contain rounded-lg opacity-90 group-hover:opacity-100 transition-opacity" />
          <div className="text-center md:text-left">
            <p className="text-sm font-bold tracking-tight leading-none">
              <span style={{ color: C.text }}>Next</span><span style={{ color: C.gold }}>Slot</span>
            </p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: FONT_BODY, maxWidth: 250, lineHeight: 1.45 }}>
              Online booking and business management software for independent service businesses.
            </p>
          </div>
        </Link>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
            {[
              { to: "/online-booking-software", label: "Online booking" },
              { to: "/business-management-software", label: "Business management" },
              { to: "/client-management", label: "Client management" },
              { to: "/business-analytics", label: "Business analytics" },
              { to: "/business-growth", label: "Business growth" },
              { to: "/pricing", label: "Pricing" },
              { to: "/resources", label: "Resources" },
              { to: "/about", label: "About" },
              { to: "/privacy", label: "Privacy" },
              { to: "/terms", label: "Terms" },
            ].map(({ to, label }) => (
              <Link key={to} to={to} style={{ fontSize: 12, color: C.muted, textDecoration: "none", fontFamily: FONT_BODY }}>{label}</Link>
            ))}
          </div>
        </nav>
        <p style={{ fontSize: 11, color: C.muted, fontFamily: FONT_BODY, textAlign: "center" }}>
          © {new Date().getFullYear()} NextSlot. Proudly made in South Africa.
        </p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
