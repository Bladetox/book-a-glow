import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Orb } from "./Orb";
import { SpeechBubble } from "./SpeechBubble";
import { Eyebrow } from "./Eyebrow";

export const NextyAISection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      padding: isMobile ? "64px 24px" : "120px 40px",
      maxWidth: 1200, margin: "0 auto",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? 48 : 80,
        alignItems: "center",
      }}>
        {/* Left: copy */}
        <div>
          <Eyebrow text="Nexty AI" />
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 30 : 44,
            fontWeight: 800,
            lineHeight: 1.1,
            color: C.text,
            marginBottom: 20,
          }}>
            Your proactive<br />
            <span style={{ color: C.gold }}>business advisor.</span>
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 28 }}>
            Nexty monitors your bookings, revenue, and client behaviour 24/7.
            It surfaces Critical, Growth, Retention, and Operations insights,
            ranked by rand impact, so you always know what to act on next.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { dot: C.red,   label: "Critical",  text: "3 clients lapsed 14+ days. R 1,200 at risk." },
              { dot: C.em,    label: "Growth",    text: "Tuesday 10–12pm converts 2.4× better. Add a premium tier." },
              { dot: C.blue,  label: "Retention", text: "48hr reminder clients return 3× more often." },
              { dot: C.amber, label: "Ops",       text: "Open slots on Thu could add R 3,480 this week." },
            ].map((r, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 14px",
                background: C.s1, borderRadius: 10,
                border: `1px solid ${C.border}`,
                fontFamily: FONT_BODY,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flexShrink: 0, marginTop: 4 }} />
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.dot, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 6 }}>{r.label}</span>
                  <span style={{ fontSize: 13, color: C.muted }}>{r.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: orb + speech bubbles */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative", height: isMobile ? 180 : 240, marginBottom: 8 }}>
            <Orb scale={isMobile ? 0.45 : 0.75} />
          </div>
          <SpeechBubble
            type="critical"
            speaker="Nexty"
            label="Critical"
            message="3 of your regulars haven't booked in 14 days. Based on their average spend, you're looking at R 1,200 at risk this week."
            action="View clients"
            delay={0.1}
          />
          <SpeechBubble
            type="growth"
            speaker="Nexty"
            label="Growth"
            message="Your Tuesday 10am–12pm slots convert 2.4× better than average. Consider adding a premium tier for that window."
            action="See breakdown"
            delay={0.3}
          />
          <SpeechBubble
            type="retention"
            speaker="Nexty"
            label="Retention"
            message="Clients who receive a 48hr reminder return 3× more often. Only 4 of your 22 active clients have reminders enabled."
            action="Enable reminders"
            delay={0.5}
          />
        </div>
      </div>
    </section>
  );
};
