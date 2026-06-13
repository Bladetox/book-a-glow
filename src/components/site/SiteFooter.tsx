import { Link } from "react-router-dom";
import { C, FONT_BODY } from "@/components/home/tokens";

const SiteFooter = () => (
  <footer
    style={{
      background: C.bg,
      borderTop: `1px solid ${C.border}`,
    }}
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">

        {/* Logo + wordmark */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/web-app-manifest-192x192.png"
            alt="NextSlot logo"
            className="h-7 w-7 md:h-8 md:w-8 object-contain rounded-lg opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <div className="text-center md:text-left">
            <p className="text-sm font-bold tracking-tight leading-none">
              <span style={{ color: C.text }}>Next</span><span style={{ color: C.gold }}>Slot</span>
            </p>
            <p
              style={{
                fontSize: 11,
                color: C.muted,
                marginTop: 3,
                fontFamily: FONT_BODY,
                maxWidth: 200,
                lineHeight: 1.4,
              }}
            >
              Built for the people behind the chair, the studio, and the craft.
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
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

        <p style={{ fontSize: 11, color: C.muted, fontFamily: FONT_BODY }}>
          &copy; {new Date().getFullYear()} NextSlot. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
