import { C, FONT_DISPLAY, FONT_BODY, BP } from "./tokens";
import useWindowWidth from "./useWindowWidth";
import Eyebrow from "./Eyebrow";
import InsightCard from "./InsightCard";

/* ─── ProactiveAlertsSection ───────────────────────────────── */
const ProactiveAlertsSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      maxWidth: 1200,
      margin:   "0 auto",
      padding:  isMobile ? "72px 24px" : "120px 48px",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 64 }}>
        <Eyebrow text="Proactive Alerts" />
        <h2 style={{
          fontFamily:    FONT_DISPLAY,
          fontSize:      isMobile ? 28 : 44,
          fontWeight:    800,
          color:         C.text,
          letterSpacing: "-0.02em",
          lineHeight:    1.1,
          marginBottom:  16,
        }}>
          Four lenses on your business.
          <br />
          <span style={{ color: C.gold }}>Ranked by rand impact.</span>
        </h2>
        <p style={{
          fontSize:   isMobile ? 14 : 16,
          color:      C.muted,
          lineHeight: 1.7,
          maxWidth:   520,
          margin:     "0 auto",
          fontFamily: FONT_BODY,
        }}>
          Critical. Growth. Retention. Operations. Nexty categorises every insight and surfaces the ones that cost you the most money first.
        </p>
      </div>

      {/* Insight cards grid */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
        gap:                 16,
      }}>
        <InsightCard
          type="critical"
          badge="Critical"
          message="3 clients haven't booked in 14+ days. Estimated R 1,200 in at-risk revenue this month."
          action="View lapsed clients"
          delay={0.05}
        />
        <InsightCard
          type="growth"
          badge="Growth"
          message="Tuesday 10–12pm converts 2.4× better than your average slot. Adding a premium service tier here could add R 2,800/month."
          action="Optimise that slot"
          delay={0.15}
        />
        <InsightCard
          type="retention"
          badge="Retention"
          message="Clients receiving a 48hr reminder return 3× more often. 6 of tomorrow’s bookings don’t have one scheduled."
          action="Enable reminders"
          delay={0.25}
        />
        <InsightCard
          type="ops"
          badge="Operations"
          message="Your cancellation rate rose from 14% to 22% this week. A 30% deposit policy on new bookings typically cuts this in half."
          action="Set deposit policy"
          delay={0.35}
        />
      </div>
    </section>
  );
};

export default ProactiveAlertsSection;
