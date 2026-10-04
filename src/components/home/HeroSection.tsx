import { PrimaryCTA } from "./PrimaryCTA";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import heroImage from "../../assets/NexSlot_Hero.png";

export const HeroSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{ position: "relative", minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", overflow: "hidden", background: C.bg }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 78% 48%, rgba(212,165,116,0.10), transparent 34%), linear-gradient(180deg, #080808 0%, #0b0b0a 100%)" }} />

      <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: isMobile ? 44 : 64, alignItems: "center", width: "100%", maxWidth: 1120, margin: "0 auto", padding: isMobile ? "96px 24px 56px" : "112px 40px 72px" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: FONT_BODY, marginBottom: 24, animation: "fadeUp 0.5s ease both" }}>
            For independent service businesses
          </p>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(32px,8.5vw,46px)" : "clamp(38px,4vw,56px)", fontWeight: 700, color: C.text, lineHeight: 1.06, letterSpacing: "-0.025em", margin: 0, marginBottom: 22, maxWidth: 560, animation: "fadeUp 0.5s 0.08s ease both" }}>
            More than<br />
            bookings. <span style={{ color: C.gold }}>Built for growth.</span>
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 17, color: C.muted, lineHeight: 1.65, marginBottom: 32, maxWidth: 500, fontFamily: FONT_BODY, fontWeight: 400, animation: "fadeUp 0.5s 0.16s ease both" }}>
            Take bookings online. Collect deposits and payments. Keep client history, availability and the work behind each appointment in one place. Then use what your business is telling you to decide what to do next.
          </p>
          <div style={{ animation: "fadeUp 0.5s 0.24s ease both", display: "flex", flexDirection: "column", alignItems: isMobile ? "stretch" : "flex-start" }}>
            <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
            <p style={{ marginTop: 10, fontSize: 11, color: C.faint, fontFamily: FONT_BODY, fontWeight: 400, textAlign: isMobile ? "center" : "left" }}>
              No payment required · Free trial · Built in South Africa
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 28, color: C.faint, fontFamily: FONT_BODY, fontSize: 11, lineHeight: 1.5, animation: "fadeUp 0.5s 0.32s ease both" }}>
            <span>Bookings</span><span>Payments</span><span>Clients</span><span>Operations</span><span>Insights</span>
          </div>
        </div>

        <div style={{ position: "relative", width: "100%", animation: "fadeSlideIn 0.7s 0.12s ease both" }}>
          <div aria-hidden="true" style={{ position: "absolute", width: isMobile ? 220 : 360, height: isMobile ? 220 : 360, right: isMobile ? "4%" : "8%", top: "50%", transform: "translateY(-50%)", borderRadius: "50%", background: "rgba(212,165,116,0.12)", filter: "blur(70px)", pointerEvents: "none" }} />
          <div style={{ position: "relative", border: "1px solid " + C.border2, borderRadius: 20, overflow: "hidden", background: C.s1, boxShadow: "0 24px 70px rgba(0,0,0,0.42), 0 0 0 1px rgba(212,165,116,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", borderBottom: "1px solid " + C.border, background: "rgba(255,255,255,0.025)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.20)" }} />
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.20)" }} />
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.20)" }} />
              <span style={{ marginLeft: 8, color: C.faint, fontFamily: FONT_BODY, fontSize: 10, letterSpacing: "0.01em" }}>NextSlot</span>
            </div>
            <img src={heroImage} alt="NextSlot business management interface" style={{ display: "block", width: "100%", height: "auto", aspectRatio: "16 / 10", objectFit: "cover", objectPosition: "center" }} />
          </div>
          <p style={{ margin: "10px 4px 0", color: C.faint, fontFamily: FONT_BODY, fontSize: 10, lineHeight: 1.5 }}>A closer look at the product</p>
        </div>
      </div>
    </section>
  );
};
