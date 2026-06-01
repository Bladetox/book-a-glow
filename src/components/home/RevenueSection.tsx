import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

const BAR_DATA = [
  { day: "Mon", value: 60,  amount: "R 1,140" },
  { day: "Tue", value: 85,  amount: "R 1,615" },
  { day: "Wed", value: 45,  amount: "R 855"   },
  { day: "Thu", value: 90,  amount: "R 1,710" },
  { day: "Fri", value: 100, amount: "R 1,900" },
  { day: "Sat", value: 78,  amount: "R 1,482" },
  { day: "Sun", value: 20,  amount: "R 380"   },
];

export const RevenueSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      background: C.s1,
      borderTop:  `1px solid ${C.border}`,
      borderBottom:`1px solid ${C.border}`,
      padding: isMobile ? "64px 24px" : "100px 40px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 48 : 80,
          alignItems: "center",
        }}>
          {/* Left: Revenue dashboard card */}
          <div style={{
            background: C.s2,
            borderRadius: 20,
            padding: isMobile ? "24px 20px" : "32px 28px",
            border: `1px solid ${C.border2}`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            fontFamily: FONT_BODY,
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: C.faint, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Revenue this week</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, color: C.gold, lineHeight: 1 }}>R 9,082</div>
                <div style={{ fontSize: 12, color: C.em, marginTop: 4 }}>+18% vs last week</div>
              </div>
              <div style={{
                background: "rgba(52,211,153,0.1)",
                border: "1px solid rgba(52,211,153,0.2)",
                borderRadius: 8, padding: "6px 10px",
                fontSize: 11, fontWeight: 600, color: C.em,
              }}>Live</div>
            </div>
            {/* Bar chart */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 6 : 10, height: 100, marginBottom: 8 }}>
              {BAR_DATA.map((b, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: "100%",
                    height: `${b.value}%`,
                    background: i === 4
                      ? `linear-gradient(180deg, ${C.gold} 0%, ${C.goldDim} 100%)`
                      : `rgba(212,165,116,0.22)`,
                    borderRadius: "4px 4px 0 0",
                    boxShadow: i === 4 ? `0 0 12px rgba(212,165,116,0.4)` : "none",
                    animation: `fillBar 0.8s ease ${i * 0.08}s both`,
                    "--bar-w": "100%",
                  } as React.CSSProperties} />
                  <div style={{ fontSize: 9, color: C.faint }}>{b.day}</div>
                </div>
              ))}
            </div>
            {/* Projection strip */}
            <div style={{
              marginTop: 16, padding: "12px 14px",
              background: C.bg, borderRadius: 10,
              border: `1px solid ${C.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 12, color: C.muted }}>Month projection</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.gold }}>R 38,400</span>
            </div>
            <div style={{
              marginTop: 8, padding: "10px 14px",
              background: C.bg, borderRadius: 10,
              border: `1px solid ${C.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 12, color: C.muted }}>To beat last month</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.em }}>R 4,160 away</span>
            </div>
          </div>

          {/* Right: copy */}
          <div>
            <Eyebrow text="Revenue Intelligence" />
            <h2 style={{
              fontFamily: FONT_DISPLAY,
              fontSize: isMobile ? 30 : 44,
              fontWeight: 800,
              lineHeight: 1.1,
              color: C.text,
              marginBottom: 20,
            }}>
              Know exactly where<br />
              <span style={{ color: C.gold }}>your money is going.</span>
            </h2>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
              Real-time revenue tracking, weekly bar charts, month-to-date projections,
              and a goal-gradient that shows you exactly how much you need to beat last month.
              No spreadsheets. No guesswork.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT_BODY }}>
              {[
                { label: "Live revenue tracking",       desc: "Updated with every booking and payment" },
                { label: "Month projection",            desc: "Forecast based on your current booking pace" },
                { label: "Beat last month goal",        desc: "Exact rand amount left to hit your record" },
                { label: "Booking heatmap",             desc: "See which days and times drive the most demand" },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(212,165,116,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: C.faint }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
