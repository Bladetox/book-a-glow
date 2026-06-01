import { C, FONT_DISPLAY, FONT_BODY, BP } from "./tokens";
import useWindowWidth from "./useWindowWidth";
import Eyebrow from "./Eyebrow";
import Orb from "./Orb";
import SpeechBubble from "./SpeechBubble";

/* ─── NextyAISection ──────────────────────────────────────── */
const NextyAISection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      padding:    isMobile ? "72px 24px" : "120px 48px",
      maxWidth:   1200,
      margin:     "0 auto",
      overflow:   "hidden",
    }}>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? 48 : 72 }}>
        <Eyebrow text="Nexty AI" />
        <h2 style={{
          fontFamily:    FONT_DISPLAY,
          fontSize:      isMobile ? 28 : 44,
          fontWeight:    800,
          color:         C.text,
          letterSpacing: "-0.02em",
          lineHeight:    1.1,
          marginBottom:  16,
        }}>
          Your AI business advisor.
          <br />
          <span style={{ color: C.gold }}>Always on. Never asleep.</span>
        </h2>
        <p style={{
          fontSize:   isMobile ? 14 : 16,
          color:      C.muted,
          lineHeight: 1.7,
          maxWidth:   540,
          margin:     "0 auto",
          fontFamily: FONT_BODY,
        }}>
          Nexty watches your data 24/7, then surfaces the insights that matter most — ranked by rand impact.
        </p>
      </div>

      {/* ── Two-column layout: Orb left, bubbles right ── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap:                 isMobile ? 48 : 80,
        alignItems:          "center",
      }}>

        {/* Orb column */}
        <div style={{
          position:   "relative",
          height:     isMobile ? 300 : 480,
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Orb scale={isMobile ? 0.6 : 1} />
        </div>

        {/* Speech bubbles column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SpeechBubble
            type="critical"
            speaker="Nexty"
            label="Critical"
            message="3 clients haven't returned in 14+ days. You're sitting on R 1,200 in at-risk revenue. Want me to draft a re-engagement message?"
            action="Re-engage clients"
            delay={0.1}
          />
          <SpeechBubble
            type="growth"
            speaker="Nexty"
            label="Growth"
            message="Tuesday 10–12pm converts 2.4× better than any other slot. Consider adding a premium tier there."
            action="Review slot pricing"
            delay={0.3}
          />
          <SpeechBubble
            type="retention"
            speaker="Nexty"
            label="Retention"
            message="Clients who receive a 48hr reminder return 3× more often. You have 6 bookings tomorrow without one."
            action="Enable reminders"
            delay={0.5}
          />
          <SpeechBubble
            type="ops"
            speaker="Nexty"
            label="Ops"
            message="Your cancellation rate is 22% this week, up from 14% last week. A 30% deposit policy could reduce this significantly."
            action="Set deposit policy"
            delay={0.7}
          />
        </div>

      </div>
    </section>
  );
};

export default NextyAISection;
