import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

export const CTASection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{ background: C.bg, padding: isMobile ? "80px 24px" : "120px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <Eyebrow text="Get started today" />
        <h2 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: isMobile ? "clamp(28px,8vw,42px)" : "clamp(32px,4vw,52px)",
          fontWeight: 700, color: C.text,
          lineHeight: 1.08, marginBottom: 20,
        }}>
          Your dashboard should be<br /><span style={{ color: C.gold, fontStyle: "italic" }}>working for you.</span>
        </h2>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75, marginBottom: 40, maxWidth: 500, margin: "0 auto 40px", fontFamily: FONT_BODY }}>
          Join beauty professionals across South Africa who use NextSlot to grow smarter, book more, and stress less.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Link
            to="/onboarding"
            style={{
              background: C.gold, color: "#080808",
              fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700,
              padding: "16px 36px", borderRadius: 12,
              textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
              minHeight: 52,
              boxShadow: "0 8px 32px rgba(212,165,116,0.3)",
            }}
          >
            Start your free trial
          </Link>
        </div>
        <p style={{ marginTop: 20, fontSize: 12, color: C.faint, letterSpacing: "0.04em", fontFamily: FONT_BODY }}>
          No credit card required · 30-day free trial · Cancel anytime
        </p>
      </div>
    </section>
  );
};
