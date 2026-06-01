import { C, FONT_BODY } from "./tokens";

/* ─── InsightCard (used in Proactive Alerts section) ─────────── */
const InsightCard = ({
  type,
  badge,
  message,
  action,
  delay,
}: {
  type:    "critical" | "growth" | "retention" | "ops";
  badge:   string;
  message: string;
  action:  string;
  delay:   number;
}) => {
  const colors: Record<string, string> = {
    critical:  C.red,
    growth:    C.em,
    retention: C.blue,
    ops:       C.amber,
  };
  const bgs: Record<string, string> = {
    critical:  "rgba(255,87,87,0.1)",
    growth:    "rgba(52,211,153,0.1)",
    retention: "rgba(96,165,250,0.1)",
    ops:       "rgba(245,158,11,0.1)",
  };

  const c  = colors[type];
  const bg = bgs[type];

  return (
    <div style={{
      display:    "flex",
      alignItems: "flex-start",
      gap:        12,
      background: C.s2,
      borderRadius: 14,
      padding:    16,
      border:     `1px solid ${C.border}`,
      animation:  `fadeSlideIn 0.5s ease ${delay}s both`,
      fontFamily: FONT_BODY,
    }}>
      {/* Icon */}
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   9,
        background:     bg,
        color:          c,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {type === "critical"  && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
          {type === "growth"    && <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>}
          {type === "retention" && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
          {type === "ops"       && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
        </svg>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color:         c,
          marginBottom:  3,
        }}>{badge}</div>
        <div style={{
          fontSize:   13,
          fontWeight: 300,
          color:      C.muted,
          lineHeight: 1.55,
        }}>{message}</div>
        <div style={{
          display:    "inline-flex",
          alignItems: "center",
          gap:        4,
          fontSize:   11,
          color:      C.faint,
          marginTop:  6,
          cursor:     "pointer",
        }}>{action} →</div>
      </div>
    </div>
  );
};

export default InsightCard;
