import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";

export const CTASection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      padding: isMobile ? "80px 24px" : "120px 40px",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(212,165,116,0.08)",
          border: "1px solid rgba(212,165,116,0.2)",
          borderRadius: 100, padding: "5px 14px",
          fontSize: 11, fontWeight: 600, color: C.gold,
          letterSpacing: "0.08em", textTransform: "uppercase",
          marginBottom: 24, fontFamily: FONT_BODY,
        } as React.CSSProperties}>
          Start free today
        </div>
        <h2 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: isMobile ? 32 : 52,
          fontWeight: 800, lineHeight: 1.08,
          color: C.text, marginBottom: 20,
          letterSpacing: "-0.02em",
        }}>
          Your booking page,<br />
          <span style={{ color: C.gold }}>live in 20 minutes.</span>
        </h2>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 36, fontFamily: FONT_BODY }}>
          No credit card required. No setup fees. No complicated onboarding.
          Just a smart booking page and the tools your business actually needs.
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Link
            to="/onboarding"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.gold, color: "#080808",
              fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
              padding: "16px 36px", borderRadius: 12,
              textDecoration: "none",
              boxShadow: "0 8px 40px rgba(212,165,116,0.4)",
              letterSpacing: "0.01em",
            }}
          >
            Create your free booking page
          </Link>
          <Link
            to="/demo"
            style={{
              fontSize: 13, color: C.faint,
              textDecoration: "none",
              fontFamily: FONT_BODY,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
          >
            Or try the live demo first &rarr;
          </Link>
        </div>
        <p style={{ fontSize: 11, color: C.faint, marginTop: 18, fontFamily: FONT_BODY }}>
          30-day free trial · No payment required · Cancel anytime
        </p>
      </div>
    </section>
  );
};
