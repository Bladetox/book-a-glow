import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

const CTA_BG     = "radial-gradient(circle at 30% 26%, rgba(255,242,185,0.92) 0%, transparent 36%), radial-gradient(circle at 50% 50%, #D4A574 0%, #B8915F 48%, #7a4200 100%)";
const CTA_SHADOW = "inset -3px -5px 12px rgba(0,0,0,0.6), inset 3px 3px 8px rgba(255,235,160,0.22), 0 8px 32px rgba(184,145,95,0.7), 0 2px 10px rgba(0,0,0,0.65)";

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
              background: CTA_BG,
              boxShadow: CTA_SHADOW,
              color: "#080808",
              fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700,
              padding: "16px 36px", borderRadius: 12,
              textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
              minHeight: 52,
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
