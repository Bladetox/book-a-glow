import { C, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { InsightCard } from "./InsightCard";
import { Eyebrow } from "./Eyebrow";

export const ProactiveAlertsSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{ background: C.bg, padding: isMobile ? "64px 24px" : "96px 24px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
        <Eyebrow text="Proactive Alerts" />
        <h2 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)",
          fontWeight: 700, color: C.text,
          lineHeight: 1.08, marginBottom: 20,
        }}>
          If it&apos;s costing<br /><span style={{ color: C.gold }}>you money</span>, it should not be hiding.
        </h2>
        <p style={{ fontSize: 16, color: C.muted, maxWidth: 680, margin: "0 auto 48px", lineHeight: 1.7 }}>
          Stop hunting for problems. NextSlot surfaces the high-impact ones, ranked by rand value.
          So every alert earns its place on your screen.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 16, textAlign: "left" }}>
          <InsightCard
            type="critical"
            badge="Critical \u00b7 Cancellations up 22%"
            message="You lost R 3,480 to cancellations this month. Introduce a 30% deposit to protect revenue. One setting change, instant effect."
            action="Enable deposits"
            delay={0}
          />
          <InsightCard
            type="growth"
            badge="Growth \u00b7 14 open slots Thursday"
            message="Thursday afternoons are your emptiest window. At your current basket, filling 6 of those slots would add R 3,480 to this month's total."
            action="View heatmap"
            delay={0.1}
          />
          <InsightCard
            type="retention"
            badge="Retention \u00b7 9 clients gone quiet"
            message="9 clients haven't booked in 90+ days. A personalised WhatsApp to each one, sent from NextSlot, recovers 1 in 3. That's R 1,740 in potential revenue."
            action="Send reminder"
            delay={0.2}
          />
          <InsightCard
            type="ops"
            badge="Operations \u00b7 Stock below reorder"
            message="3 products are below reorder level. Restocking now prevents last-minute cancellations and lost revenue."
            action="View stock"
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
};
