import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

export const RevenueSection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section style={{
      position: "relative",
      overflow: "hidden",
      background: `linear-gradient(180deg,${C.bg} 0%,${C.s1} 100%)`,
      padding: isMobile ? "64px 24px" : "96px 24px",
    }}>
      {/* Background image */}
      <div style={{
        position:           "absolute",
        inset:              0,
        backgroundImage:    "url('https://iili.io/C3goMfj.jpg')",
        backgroundSize:     "cover",
        backgroundPosition: "center",
        backgroundRepeat:   "no-repeat",
        opacity:            0.38,
        filter:             "blur(0.5px) saturate(0.65)",
        transform:          "scale(1.04)",
        zIndex:             0,
        pointerEvents:      "none",
      }} />

      <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Eyebrow text="Revenue Intelligence" />
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)",
            fontWeight: 700, color: C.text,
            lineHeight: 1.08, marginBottom: 16,
          }}>
            Not a report card.<br /><span style={{ color: C.gold }}>A running coach.</span>
          </h2>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontFamily: FONT_BODY }}>
            NextSlot does not just show you the number. It tells you where the month is heading,
            exactly how far you are from beating last month, and which gaps to fill today.
          </p>
        </div>

        {/* Revenue card + stat tiles */}
        <div style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div style={{
            background: "rgba(14,13,12,0.72)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(212,165,116,0.28)",
            borderRadius: 20, padding: 28,
            boxShadow: "0 0 0 1px rgba(212,165,116,0.10), 0 8px 32px rgba(0,0,0,0.55), 0 0 48px rgba(212,165,116,0.08)",
            fontFamily: FONT_BODY,
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.faint, marginBottom: 8 }}>Revenue This Month</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 38 : 46, fontWeight: 700, color: C.gold, lineHeight: 1, marginBottom: 8 }}>R 22,840</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Day 18 of 31 · 13 days remaining</div>
            <div style={{ fontSize: 15, color: C.text, marginBottom: 4 }}>On track for <strong>R 39,200</strong> by month-end</div>
            <div style={{ fontSize: 13, color: C.em, marginBottom: 16 }}>+23% vs last month</div>
            <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.gold, marginBottom: 6 }}>R 4,160 to beat last month · 82% there</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: C.em, borderRadius: 99,
                  width: 0,
                  animation: "fillBar 2s 0.5s ease forwards",
                  "--bar-w": "82%",
                } as React.CSSProperties} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Bookings",      value: "7",       sub: "today",           color: C.text  },
              { label: "Revenue",       value: "R 1,950", sub: "paid in",         color: C.em    },
              { label: "Still to come", value: "4",       sub: "remaining",       color: C.text  },
              { label: "Next client",   value: "11:30",   sub: "Jess · Full Set", color: C.gold  },
            ].map((t, i) => (
              <div key={i} style={{
                background: "rgba(14,13,12,0.65)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14, padding: "18px 16px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
                fontFamily: FONT_BODY,
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.faint, marginBottom: 6 }}>{t.label}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: i === 3 ? 22 : 28, fontWeight: 700, color: t.color, lineHeight: 1, marginBottom: 4 }}>{t.value}</div>
                <div style={{ fontSize: 10, color: C.faint }}>{t.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
