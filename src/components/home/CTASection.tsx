import { PrimaryCTA } from "./PrimaryCTA";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import waIcon from "@/assets/whatsapp.png";

export const CTASection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{ background: C.bg, padding: isMobile ? "64px 24px" : "80px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: isMobile ? "clamp(30px,8vw,42px)" : "clamp(34px,4vw,52px)",
          fontWeight: 700,
          color: C.text,
          lineHeight: 1.08,
          marginBottom: 18,
        }}>
          Ready to <span style={{ color: C.gold }}>grow?</span>
        </h2>

        <p style={{
          fontSize: 16,
          color: C.muted,
          lineHeight: 1.7,
          margin: "0 auto 32px",
          maxWidth: 560,
          fontFamily: FONT_BODY,
        }}>
          Set up your NextSlot workspace and start understanding your business from the inside out, so you can make better decisions about its growth.
        </p>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          flexWrap: isMobile ? "wrap" : "nowrap",
          width: "100%",
        }}>
          <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>

          <a
            href="https://wa.me/27686806115"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            style={{
              background: "transparent",
              border: `1px solid ${C.border2}`,
              color: C.text,
              fontFamily: FONT_BODY,
              fontSize: 15,
              fontWeight: 700,
              padding: "15px 32px",
              borderRadius: 8,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              minHeight: 52,
              flex: isMobile ? "1 1 100%" : "1 1 0",
              width: isMobile ? "100%" : undefined,
              boxSizing: "border-box",
            }}
          >
            <img src={waIcon} alt="" width={20} height={20} style={{ display: "block" }} />
            Talk to us
          </a>
        </div>

        <p style={{
          marginTop: 16,
          fontSize: 12,
          color: C.faint,
          letterSpacing: "0.04em",
          fontFamily: FONT_BODY,
        }}>
          No payment required · Free trial · Cancel anytime
        </p>
      </div>
    </section>
  );
};
