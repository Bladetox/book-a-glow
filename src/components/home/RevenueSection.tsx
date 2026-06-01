import { C, FONT_DISPLAY, FONT_BODY, BP } from "./tokens";
import useWindowWidth from "./useWindowWidth";
import Eyebrow from "./Eyebrow";

/* ─── Revenue bar data ─────────────────────────────────────── */
const revenueWeeks = [
  { label: "W1",  value: 3200,  max: 8000 },
  { label: "W2",  value: 4800,  max: 8000 },
  { label: "W3",  value: 4100,  max: 8000 },
  { label: "W4",  value: 6200,  max: 8000 },
  { label: "W5",  value: 5400,  max: 8000 },
  { label: "W6",  value: 7100,  max: 8000 },
  { label: "W7",  value: 6600,  max: 8000 },
  { label: "W8",  value: 7800,  max: 8000 },
];

/* ─── RevenueSection ─────────────────────────────────────── */
const RevenueSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      background: C.s1,
      borderTop:  `1px solid ${C.border}`,
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
          <Eyebrow text="Revenue Intelligence" />
          <h2 style={{
            fontFamily:    FONT_DISPLAY,
            fontSize:      isMobile ? 28 : 42,
            fontWeight:    800,
            color:         C.text,
            letterSpacing: "-0.02em",
            lineHeight:    1.1,
            marginBottom:  20,
          }}>
            Know exactly where
            <br />
            <span style={{ color: C.gold }}>your money is going.</span>
          </h2>
          <p style={{
            fontSize:    isMobile ? 14 : 16,
            color:       C.muted,
            lineHeight:  1.7,
            marginBottom: 28,
            fontFamily:  FONT_BODY,
          }}>
            Revenue projection, goal-gradient tracking, and week-on-week comparisons. See not just what you earned, but what you’re on track to earn.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              { label: "This month so far", value: "R 37,400" },
              { label: "Projected month-end", value: "R 51,200" },
              { label: "vs last month", value: "+18%", color: C.em },
            ].map((s, i) => (
              <div key={i}>
                <div style={{
                  fontFamily:    FONT_DISPLAY,
                  fontSize:      isMobile ? 22 : 26,
                  fontWeight:    800,
                  color:         s.color ?? C.text,
                  letterSpacing: "-0.01em",
                }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 2, fontFamily: FONT_BODY }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: bar chart mock ── */}
        <div style={{
          background:   C.s2,
          borderRadius: 20,
          border:       `1px solid ${C.border}`,
          padding:      isMobile ? "24px 20px" : "32px 28px",
        }}>
          <div style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            marginBottom:   24,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT_BODY }}>Revenue — last 8 weeks</span>
            <span style={{ fontSize: 11, color: C.faint, fontFamily: FONT_BODY }}>ZAR</span>
          </div>

          {/* Bars */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 140 }}>
            {revenueWeeks.map((w, i) => {
              const pct = (w.value / w.max) * 100;
              const isLast = i === revenueWeeks.length - 1;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <div style={{
                    width:        "100%",
                    height:       `${pct}%`,
                    borderRadius: "6px 6px 3px 3px",
                    background:   isLast
                      ? `linear-gradient(180deg, ${C.gold} 0%, ${C.goldDim} 100%)`
                      : `rgba(212,165,116,0.22)`,
                    boxShadow:    isLast ? `0 0 12px rgba(212,165,116,0.4)` : "none",
                    animation:    `fillBar 0.8s ease ${i * 0.07}s both`,
                    ["--bar-w" as string]: `${pct}%`,
                  }} />
                  <span style={{ fontSize: 9, color: C.faint, fontFamily: FONT_BODY }}>{w.label}</span>
                </div>
              );
            })}
          </div>

          {/* Goal gradient */}
          <div style={{
            marginTop:    20,
            padding:      "12px 14px",
            background:   C.bg,
            borderRadius: 10,
            border:       `1px solid ${C.border}`,
            display:      "flex",
            justifyContent: "space-between",
            alignItems:   "center",
          }}>
            <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT_BODY }}>R 4,160 to beat last month</span>
            <span style={{
              fontSize:   11,
              fontWeight: 700,
              color:      C.em,
              fontFamily: FONT_BODY,
            }}>82% there</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default RevenueSection;
