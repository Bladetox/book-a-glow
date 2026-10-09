import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";
import { Orb } from "./Orb";
import { SpeechBubble } from "./SpeechBubble";

const HEAT_ROWS = [
  { day: "Mon", slots: [6, 9, 5, 7, 4] },
  { day: "Tue", slots: [2, 3, 2, 1, 2] },
  { day: "Wed", slots: [7, 11, 8, 9, 6] },
  { day: "Thu", slots: [4, 6, 5, 3, 4] },
  { day: "Fri", slots: [10, 14, 12, 13, 9] },
  { day: "Sat", slots: [15, 18, 16, 14, 11] },
  { day: "Sun", slots: [3, 4, 2, 2, 1] },
];

const heatColor = (v: number) =>
  v < 4
    ? "rgba(126,96,58,0.08)"
    : v < 8
      ? "rgba(52,211,153,0.18)"
      : v < 12
        ? "rgba(52,211,153,0.42)"
        : "rgba(52,211,153,0.72)";

const TIME_LABELS = ["9am", "11am", "1pm", "3pm", "5pm"];

export const HeatmapSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section className="home-heatmap">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto", padding: isMobile ? "0 8px" : 0 }}>
          <Eyebrow text="See the opportunity" />
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: isMobile ? 30 : 44,
              fontWeight: 800,
              lineHeight: 1.08,
              color: C.text,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
            }}
          >
            See what's <span style={{ color: C.gold }}>hiding</span> in your bookings.
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: 0 }}>
            Patterns become easier to spot when your booking history is in one place. Nexty helps turn those patterns into something worth acting on.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
            gap: isMobile ? 24 : 44,
            alignItems: "center",
            marginTop: isMobile ? 24 : 36,
          }}
        >
          <div
            style={{
              background: C.s2,
              borderRadius: 20,
              padding: isMobile ? "20px 16px" : "28px 24px",
              border: `1px solid ${C.border2}`,
              boxShadow: "0 10px 28px rgba(66,48,27,0.10)",
              fontFamily: FONT_BODY,
            }}
          >
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 16 }}>
              Booking demand by day &amp; time
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "40px repeat(5,1fr)", gap: 4, marginBottom: 6 }}>
              <div />
              {TIME_LABELS.map((t) => (
                <div key={t} style={{ fontSize: 9, color: C.faint, textAlign: "center" }}>{t}</div>
              ))}
            </div>

            {HEAT_ROWS.map((row) => (
              <div key={row.day} style={{ display: "grid", gridTemplateColumns: "40px repeat(5,1fr)", gap: 4, marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: C.faint, display: "flex", alignItems: "center" }}>{row.day}</div>
                {row.slots.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      height: isMobile ? 26 : 34,
                      borderRadius: 6,
                      background: heatColor(v),
                      border: "1px solid rgba(126,96,58,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 9, color: v >= 12 ? "rgba(52,211,153,0.9)" : C.faint }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ marginTop: 14, fontSize: 11, color: C.faint }}>
              Saturday 11am is the peak slot · 18 bookings on average
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                position: "relative",
                height: isMobile ? 180 : 220,
                marginBottom: 20,
                overflow: "visible",
              }}
            >
              <Orb scale={isMobile ? 0.72 : 0.82} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SpeechBubble
                type="growth"
                speaker="Nexty"
                label="Growth"
                message="Tuesday afternoons sit empty most weeks. Worth a promo to fill them."
                action="See the gap"
                delay={0}
              />
              <SpeechBubble
                type="critical"
                speaker="Nexty"
                label="Retention"
                message="Your booking patterns show where clients are returning, and where they are not."
                action="Find the opportunity"
                delay={0.15}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};