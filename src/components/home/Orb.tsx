import { C, FONT_DISPLAY } from "./tokens";

/* ─── Orb ─────────────────────────────────────────────────── */
const Orb = ({ scale = 1 }: { scale?: number }) => {
  const s = (v: number) => v * scale;

  return (
    <div style={{
      position:       "absolute",
      left:           "50%",
      top:            "50%",
      transform:      "translate(-50%,-50%)",
      width:          s(80),
      height:         s(80),
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      zIndex:         10,
      pointerEvents:  "none",
    }}>

      {/* Aura rings */}
      {[240, 380, 520].map((size, i) => (
        <div key={i} style={{
          position:     "absolute",
          width:        s(size),
          height:       s(size),
          borderRadius: "50%",
          background: i < 2
            ? `radial-gradient(circle, rgba(212,165,116,${i === 0 ? 0.14 : 0.05}) 0%, transparent ${i === 0 ? 65 : 60}%)`
            : `radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 55%)`,
          animation: `orbAuraPulse ${[3.5, 5.2, 7][i]}s ease-in-out infinite ${[0, 0.9, 1.8][i]}s`,
        }} />
      ))}

      {/* Outer spin ring */}
      <div style={{
        position:        "absolute",
        width:           s(190),
        height:          s(190),
        borderRadius:    "50%",
        border:          "1.5px solid transparent",
        borderTopColor:    "rgba(212,165,116,0.9)",
        borderRightColor:  "rgba(212,165,116,0.28)",
        borderBottomColor: "rgba(212,165,116,0.04)",
        borderLeftColor:   "rgba(212,165,116,0.28)",
        animation:       "orbSpinA 2.8s linear infinite",
        filter:          "drop-shadow(0 0 5px rgba(212,165,116,0.55))",
        pointerEvents:   "none",
      }} />

      {/* Inner spin ring */}
      <div style={{
        position:        "absolute",
        width:           s(145),
        height:          s(145),
        borderRadius:    "50%",
        border:          "1px solid transparent",
        borderTopColor:    "rgba(212,165,116,0.45)",
        borderRightColor:  "rgba(212,165,116,0.1)",
        borderBottomColor: "transparent",
        borderLeftColor:   "rgba(212,165,116,0.1)",
        animation:       "orbSpinB 4.2s linear infinite",
        pointerEvents:   "none",
      }} />

      {/* Core sphere */}
      <div style={{
        position:     "relative",
        width:        s(80),
        height:       s(80),
        borderRadius: "50%",
        background:   "radial-gradient(circle at 30% 26%, rgba(255,242,185,0.92) 0%, transparent 36%), radial-gradient(circle at 50% 50%, #D4A574 0%, #B8915F 48%, #7a4200 100%)",
        boxShadow:    "inset -3px -5px 12px rgba(0,0,0,0.6), inset 3px 3px 8px rgba(255,235,160,0.22), 0 8px 32px rgba(184,145,95,0.7), 0 2px 10px rgba(0,0,0,0.65)",
        animation:    "orbBreathe 4s ease-in-out infinite",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}>
        {/* Highlight */}
        <div style={{
          position:     "absolute",
          width:        s(22),
          height:       s(13),
          background:   "radial-gradient(ellipse, rgba(255,255,255,0.52) 0%, transparent 72%)",
          top:          s(13),
          left:         s(15),
          borderRadius: "50%",
          transform:    "rotate(-22deg)",
        }} />
        <span style={{
          fontFamily:    FONT_DISPLAY,
          fontSize:      s(9),
          color:         "rgba(8,8,8,0.75)",
          letterSpacing: "0.04em",
          position:      "relative",
          zIndex:        1,
        }}>nexty</span>
      </div>

      {/* Orbiting dots */}
      {[
        { anim: `dotOrbitA 2.8s linear infinite`,      tx: s(93) },
        { anim: `dotOrbitBm 4.2s linear infinite`,     tx: s(71) },
        { anim: `dotOrbitC 3.4s linear infinite 1.1s`, tx: s(93) },
      ].map((d, i) => (
        <div key={i} style={{
          position:     "absolute",
          width:        s(7),
          height:       s(7),
          borderRadius: "50%",
          background:   C.gold,
          boxShadow:    `0 0 ${s(10)}px rgba(212,165,116,0.9)`,
          animation:    d.anim,
          ["--orb-tx" as string]: `${d.tx}px`,
        }} />
      ))}
    </div>
  );
};

export default Orb;
