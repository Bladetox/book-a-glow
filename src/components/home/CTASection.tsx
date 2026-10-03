import { Link } from "react-router-dom";
import { PrimaryCTA } from "./PrimaryCTA";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";
import waIcon from "@/assets/whatsapp.png";

export const CTASection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{ background: C.bg, padding: isMobile ? "80px 24px" : "120px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <Eyebrow text="free trial" />
        <h2 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: isMobile ? "clamp(28px,8vw,42px)" : "clamp(32px,4vw,52px)",
          fontWeight: 700, color: C.text,
          lineHeight: 1.08, marginBottom: 20,
        }}>
          Your dashboard should be<br /><span style={{ color: C.gold, fontStyle: "italic" }}>working for you.</span>
        </h2>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75, marginBottom: 40, maxWidth: 500, margin: "0 auto 40px", fontFamily: FONT_BODY }}>
          Set up your booking page in under 10 minutes. Let NextSlot handle the booking admin while you focus on the work, then use the dashboard and Nexty to understand what is happening in the business.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
          <a
            href="https://wa.me/27686806115"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            style={{
              background: C.s1,
              border: `1px solid ${C.border2}`,
              color: C.text,
              fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700,
              padding: "16px 30px", borderRadius: 12,
              textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 10,
              minHeight: 52,
            }}
          >
            <img src={waIcon} alt="" width={20} height={20} style={{ display: "block" }} />
            Talk to us
          </a>
        </div>
        <p style={{ marginTop: 20, fontSize: 12, color: C.faint, letterSpacing: "0.04em", fontFamily: FONT_BODY }}>
          No payment required · Free trial · Cancel anytime
        </p>
      </div>
    </section>
  );
};
