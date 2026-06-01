import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

const ROWS = [
  { feature: "Online booking page",                   them: "✓",          us: "✓",                   usOnly: false },
  { feature: "Basic dashboard & stats",               them: "✓",          us: "✓",                   usOnly: false },
  { feature: "Revenue projection this month",         them: "—",          us: "✓",                   usOnly: true  },
  { feature: "Goal-gradient: R X to beat last month", them: "—",          us: "✓",                   usOnly: true  },
  { feature: "Proactive AI business insights",        them: "—",          us: "✓ Nexty AI",           usOnly: true  },
  { feature: "Booking heatmap (demand by day/time)",  them: "—",          us: "✓",                   usOnly: true  },
  { feature: "Inactive client alerts (90 days)",      them: "—",          us: "✓",                   usOnly: true  },
  { feature: "Loyalty program with AI enrolment",     them: "Some tools", us: "✓ AI-suggested",      usOnly: true  },
  { feature: "Lead source / acquisition tracking",    them: "—",          us: "✓",                   usOnly: true  },
  { feature: "Stock alerts on dashboard",             them: "—",          us: "✓",                   usOnly: true  },
  { feature: "Built for South African businesses",    them: "Rarely",     us: "✓ Yoco · ZAR · POPIA", usOnly: true  },
];

export const ComparisonSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      background: C.s1,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      padding: isMobile ? "64px 24px" : "100px 40px",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 36 : 52 }}>
          <Eyebrow text="How we compare" />
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 30 : 44,
            fontWeight: 800, lineHeight: 1.1,
            color: C.text, marginBottom: 14,
          }}>
            Built different.
            <br />
            <span style={{ color: C.gold }}>Not just another booking tool.</span>
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, maxWidth: 460, margin: "0 auto" }}>
            Most booking tools stop at the calendar. NextSlot goes further with AI insights,
            revenue intelligence, and tools built specifically for the South African market.
          </p>
        </div>

        {/* Table */}
        <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border2}`, fontFamily: FONT_BODY }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 64px 80px" : "1fr 120px 160px",
            background: C.s3,
            padding: isMobile ? "12px 16px" : "14px 24px",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 11, color: C.faint, fontWeight: 600 }}>Feature</div>
            <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, textAlign: "center" }}>Others</div>
            <div style={{ fontSize: 11, color: C.gold,  fontWeight: 700, textAlign: "center" }}>NextSlot</div>
          </div>
          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 64px 80px" : "1fr 120px 160px",
                padding: isMobile ? "11px 16px" : "13px 24px",
                borderBottom: i < ROWS.length - 1 ? `1px solid ${C.border}` : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: isMobile ? 12 : 13, color: C.muted }}>{row.feature}</div>
              <div style={{ textAlign: "center", fontSize: 13, color: C.faint }}>{row.them}</div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: row.usOnly ? 700 : 400, color: row.usOnly ? C.em : C.muted }}>{row.us}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
