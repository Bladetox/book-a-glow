import { C, FONT_DISPLAY, FONT_BODY, BP } from "./tokens";
import useWindowWidth from "./useWindowWidth";
import Eyebrow from "./Eyebrow";

/* ─── Heatmap colour helper ─────────────────────────────────── */
const heatColor = (v: number) =>
  v < 4  ? "rgba(255,255,255,0.04)"
: v < 8  ? "rgba(52,211,153,0.18)"
: v < 12 ? "rgba(52,211,153,0.42)"
:          "rgba(52,211,153,0.72)";

/* ─── Heatmap data ─────────────────────────────────────────── */
const heatRows = [
  { day: "Mon", slots: [6,  9,  5,  7,  4] },
  { day: "Tue", slots: [2,  3,  2,  1,  2] },
  { day: "Wed", slots: [7, 11,  8,  9,  6] },
  { day: "Thu", slots: [4,  6,  5,  3,  4] },
  { day: "Fri", slots: [10,14, 12, 13,  9] },
  { day: "Sat", slots: [15,18, 16, 14, 11] },
  { day: "Sun", slots: [3,  4,  2,  2,  1] },
];

const timeLabels = ["8–9am", "10–12pm", "12–2pm", "2–4pm", "4–6pm"];

/* ─── HeatmapSection ──────────────────────────────────────── */
const HeatmapSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      background:   C.s1,
      borderTop:    `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        maxWidth: 1200,
        margin:   "0 auto",
        padding:  isMobile ? "72px 24px" : "120px 48px",
        display:  "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap:      isMobile ? 48 : 80,
        alignItems: "center",
      }}>

        {/* ── Left: copy ── */}
        <div>
          <Eyebrow text="Booking Heatmap" />
          <h2 style={{
            fontFamily:    FONT_DISPLAY,
            fontSize:      isMobile ? 28 : 42,
            fontWeight:    800,
            color:         C.text,
            letterSpacing: "-0.02em",
            lineHeight:    1.1,
            marginBottom:  20,
          }}>
            See when your clients
            <br />
            <span style={{ color: C.gold }}>actually show up.</span>
          </h2>
          <p style={{
            fontSize:    isMobile ? 14 : 16,
            color:       C.muted,
            lineHeight:  1.7,
            marginBottom: 28,
            fontFamily:  FONT_BODY,
          }}>
            The booking heatmap shows demand by day and time across your whole history. Stop guessing your peak hours. See them.
          </p>

          {/* Legend */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { color: "rgba(255,255,255,0.04)", label: "Low" },
              { color: "rgba(52,211,153,0.18)",  label: "" },
              { color: "rgba(52,211,153,0.42)",  label: "" },
              { color: "rgba(52,211,153,0.72)",  label: "High" },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width:        14,
                  height:       14,
                  borderRadius: 3,
                  background:   l.color,
                  border:       `1px solid ${C.border}`,
                }} />
                {l.label && <span style={{ fontSize: 11, color: C.faint, fontFamily: FONT_BODY }}>{l.label}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: heatmap grid ── */}
        <div style={{
          background:   C.s2,
          borderRadius: 20,
          border:       `1px solid ${C.border}`,
          padding:      isMobile ? "20px 16px" : "28px 24px",
        }}>
          {/* Time labels */}
          <div style={{
            display:             "grid",
            gridTemplateColumns: `48px repeat(5, 1fr)`,
            gap:                 6,
            marginBottom:        8,
          }}>
            <div />
            {timeLabels.map((t, i) => (
              <div key={i} style={{
                fontSize:   9,
                color:      C.faint,
                textAlign:  "center",
                fontFamily: FONT_BODY,
              }}>{t}</div>
            ))}
          </div>

          {/* Rows */}
          {heatRows.map((row, ri) => (
            <div key={ri} style={{
              display:             "grid",
              gridTemplateColumns: `48px repeat(5, 1fr)`,
              gap:                 6,
              marginBottom:        6,
            }}>
              <div style={{
                fontSize:   11,
                fontWeight: 600,
                color:      C.faint,
                display:    "flex",
                alignItems: "center",
                fontFamily: FONT_BODY,
              }}>{row.day}</div>
              {row.slots.map((v, ci) => (
                <div key={ci} style={{
                  height:       isMobile ? 28 : 36,
                  borderRadius: 6,
                  background:   heatColor(v),
                  border:       `1px solid ${C.border}`,
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  fontSize:     9,
                  color:        v >= 8 ? "rgba(52,211,153,0.9)" : C.faint,
                  fontWeight:   600,
                  fontFamily:   FONT_BODY,
                }}>{v}</div>
              ))}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HeatmapSection;
