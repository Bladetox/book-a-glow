import { C, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { InsightCard } from "./InsightCard";
import { Eyebrow } from "./Eyebrow";

export const ProactiveAlertsSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      padding: isMobile ? "64px 24px" : "100px 40px",
      maxWidth: 1200, margin: "0 auto",
    }}>
      <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 60 }}>
        <Eyebrow text="Proactive Alerts" />
        <h2 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: isMobile ? 30 : 44,
          fontWeight: 800,
          lineHeight: 1.1,
          color: C.text,
          marginBottom: 16,
        }}>
          Nexty tells you what to fix<br />
          <span style={{ color: C.gold }}>before it becomes a problem.</span>
        </h2>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>
          Every insight is categorised, prioritised by rand impact, and surfaces only when it's relevant to your business.
          No noise. Just the right nudge at the right time.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
        gap: 12,
        maxWidth: 800, margin: "0 auto",
      }}>
        <InsightCard
          type="critical"
          badge="Critical"
          message="3 of your regular clients haven't booked in 14+ days. Estimated R 1,200 revenue at risk this month."
          action="View lapsed clients"
          delay={0.1}
        />
        <InsightCard
          type="growth"
          badge="Growth"
          message="Your Tuesday 10am–12pm window converts 2.4× better than other slots. Consider adding a premium-priced tier."
          action="See slot analysis"
          delay={0.2}
        />
        <InsightCard
          type="retention"
          badge="Retention"
          message="Clients with 48hr reminders enabled return 3× more often. Only 4 of 22 active clients have this on."
          action="Enable reminders"
          delay={0.3}
        />
        <InsightCard
          type="ops"
          badge="Ops"
          message="14 open slots this Thursday. Filling 6 of them at your average rate adds R 3,480 this week."
          action="Fill open slots"
          delay={0.4}
        />
      </div>
    </section>
  );
};
