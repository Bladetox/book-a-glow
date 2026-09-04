import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

const HEAT_ROWS = [
  { day: "Mon", slots: [6,  9,  5,  7,  4] },
  { day: "Tue", slots: [2,  3,  2,  1,  2] },
  { day: "Wed", slots: [7, 11,  8,  9,  6] },
  { day: "Thu", slots: [4,  6,  5,  3,  4] },
  { day: "Fri", slots: [10,14, 12, 13,  9] },
  { day: "Sat", slots: [15,18, 16, 14, 11] },
  { day: "Sun", slots: [3,  4,  2,  2,  1] },
];

const heatColor = (v: number) =>
  v < 4  ? "rgba(255,255,255,0.04)"
: v < 8  ? "rgba(52,211,153,0.18)"
: v < 12 ? "rgba(52,211,153,0.42)"
:          "rgba(52,211,153,0.72)";

const TIME_LABELS = ["9am", "11am", "1pm", "3pm", "5pm"];

export const HeatmapSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      padding: isMobile ? "64px 24px" : "100px 40px",
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
          <Eyebrow text="Booking Heatmap" />
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 30 : 44,
            fontWeight: 800, lineHeight: 1.1,
            color: C.text, marginBottom: 20,
          }}>
            You already know Saturday is busy.<br />
            <span style={{ color: C.gold }}>Now you know why Friday is not.</span>
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
            Some weeks feel full, others feel thin, and you cannot always explain why. The heatmap makes the pattern visible.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: FONT_BODY }}>
            {[
              { color: "rgba(52,211,153,0.72)",  label: "Peak demand",   desc: "Clients want in. Charge accordingly" },
              { color: "rgba(52,211,153,0.42)",  label: "High activity", desc: "Solid ground. Keep it" },
              { color: "rgba(52,211,153,0.18)",  label: "Moderate",      desc: "One well-timed offer fills this" },
              { color: "rgba(255,255,255,0.04)", label: "Low demand",    desc: "Now you know. Now you can act" },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: l.color, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, marginRight: 6 }}>{l.label}</span>
                  <span style={{ fontSize: 12, color: C.faint }}>{l.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: heatmap grid */}
        <div style={{
          background: C.s2,
          borderRadius: 20,
          padding: isMobile ? "20px 16px" : "28px 24px",
          border: `1px solid ${C.border2}`,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
          fontFamily: FONT_BODY,
        }}>
          <div style={{ fontSize: 11, color: C.faint, marginBottom: 16 }}>Booking demand by day &amp; time</div>
          {/* Time header */}
          <div style={{ display: "grid", gridTemplateColumns: "40px repeat(5,1fr)", gap: 4, marginBottom: 6 }}>
            <div />
            {TIME_LABELS.map(t => (
              <div key={t} style={{ fontSize: 9, color: C.faint, textAlign: "center" }}>{t}</div>
            ))}
          </div>
          {/* Rows */}
          {HEAT_ROWS.map(row => (
            <div key={row.day} style={{ display: "grid", gridTemplateColumns: "40px repeat(5,1fr)", gap: 4, marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: C.faint, display: "flex", alignItems: "center" }}>{row.day}</div>
              {row.slots.map((v, i) => (
                <div key={i} style={{
                  height: isMobile ? 26 : 32,
                  borderRadius: 6,
                  background: heatColor(v),
                  border: `1px solid rgba(255,255,255,0.04)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 9, color: v >= 12 ? "rgba(52,211,153,0.9)" : C.faint }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 11, color: C.faint }}>
            Saturday 11am is your peak slot &middot; 18 bookings on average
          </div>
        </div>
      </div>
    </section>
  );
};
