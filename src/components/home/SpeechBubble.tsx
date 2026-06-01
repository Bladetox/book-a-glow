import { C, FONT_BODY, FONT_DISPLAY } from "./tokens";

/* ─── SpeechBubble ─────────────────────────────────────────── */
const SpeechBubble = ({
  type,
  speaker,
  label,
  message,
  action,
  delay,
}: {
  type:    "critical" | "growth" | "retention" | "ops";
  speaker: string;
  label:   string;
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
  const glows: Record<string, string> = {
    critical:  "rgba(255,87,87,0.18)",
    growth:    "rgba(52,211,153,0.18)",
    retention: "rgba(96,165,250,0.18)",
    ops:       "rgba(245,158,11,0.18)",
  };
  const borders: Record<string, string> = {
    critical:  "rgba(255,87,87,0.22)",
    growth:    "rgba(52,211,153,0.22)",
    retention: "rgba(96,165,250,0.22)",
    ops:       "rgba(245,158,11,0.22)",
  };

  const c = colors[type];
  const g = glows[type];
  const b = borders[type];

  return (
    <div
      className={`speech-bubble speech-bubble--${type}`}
      style={{
        position:             "relative",
        background:           "rgba(16,15,14,0.72)",
        border:               `1px solid ${b}`,
        borderRadius:         18,
        borderBottomLeftRadius: 4,
        padding:              "18px 20px 16px",
        backdropFilter:       "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow:            `0 0 0 1px ${b}, 0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${g}`,
        animation:            `bubbleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
        fontFamily:           FONT_BODY,
      }}
    >
      {/* Bubble tail — border layer */}
      <div style={{
        position:    "absolute",
        bottom:      -10,
        left:        22,
        width:       0,
        height:      0,
        borderLeft:  "10px solid transparent",
        borderRight: "0px solid transparent",
        borderTop:   `10px solid ${b}`,
        filter:      `drop-shadow(0 2px 4px ${g})`,
      }} />
      {/* Bubble tail — fill layer */}
      <div style={{
        position:    "absolute",
        bottom:      -8,
        left:        23,
        width:       0,
        height:      0,
        borderLeft:  "9px solid transparent",
        borderRight: "0px solid transparent",
        borderTop:   "9px solid rgba(16,15,14,0.72)",
      }} />

      {/* Speaker row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width:          28,
          height:         28,
          borderRadius:   "50%",
          background:     `radial-gradient(circle at 32% 28%, rgba(255,240,180,0.6) 0%, transparent 40%), radial-gradient(circle, #D4A574 0%, #8a5b00 100%)`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       7,
          fontWeight:     700,
          color:          "rgba(8,8,8,0.8)",
          letterSpacing:  "0.04em",
          fontFamily:     FONT_DISPLAY,
          flexShrink:     0,
          boxShadow:      `0 0 8px rgba(212,165,116,0.5)`,
        }}>nx</div>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: FONT_DISPLAY }}>{speaker}</span>
          <span style={{ fontSize: 10, color: C.faint, marginLeft: 6 }}>· just now</span>
        </div>
        <div style={{
          marginLeft:    "auto",
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color:         c,
          background:    `rgba(0,0,0,0.3)`,
          border:        `1px solid ${b}`,
          padding:       "2px 8px",
          borderRadius:  20,
        }}>{label}</div>
      </div>

      {/* Message */}
      <p style={{
        fontSize:    13,
        fontWeight:  300,
        color:       C.text,
        lineHeight:  1.65,
        margin:      0,
        marginBottom: 12,
        fontStyle:   "italic",
      }}>"{message}"</p>

      {/* Action */}
      <div style={{
        display:       "inline-flex",
        alignItems:    "center",
        gap:           5,
        fontSize:      11,
        fontWeight:    600,
        color:         c,
        cursor:        "pointer",
        letterSpacing: "0.02em",
      }}>
        {action} →
      </div>
    </div>
  );
};

export default SpeechBubble;
