import { Link } from "react-router-dom";
import { C, FONT_BODY } from "@/components/home/tokens";

const SiteFooter = () => (
  <footer
    style={{
      background: C.bg,
      borderTop: `1px solid ${C.border}`,
    }}
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Logo + wordmark */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/web-app-manifest-192x192.png"
            alt="NextSlot logo"
            className="h-8 w-8 object-contain rounded-lg opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <div className="text-center md:text-left">
            <p className="text-sm font-bold tracking-tight leading-none">
              <span style={{ color: C.text }}>Next</span><span style={{ color: C.gold }}>Slot</span>
            </p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: FONT_BODY }}>
              Built for the people behind the chair, the studio, and the craft.
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {[
            { to: "/about",   label: "About" },
            { to: "/pricing", label: "Pricing" },
            { to: "/privacy", label: "Privacy" },
            { to: "/terms",   label: "Terms" },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{ fontSize: 12, color: C.muted, textDecoration: "none", fontFamily: FONT_BODY, transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = C.text}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = C.muted}
            >
              {label}
            </Link>
          ))}
          <a
            href="/pricing#faq"
            style={{ fontSize: 12, color: C.muted, textDecoration: "none", fontFamily: FONT_BODY, transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = C.text}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = C.muted}
          >
            FAQ
          </a>
        </nav>

        <p style={{ fontSize: 12, color: C.muted, fontFamily: FONT_BODY }}>
          &copy; {new Date().getFullYear()} NextSlot. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
