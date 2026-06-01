import { C } from "./tokens";

/* ─── Eyebrow pill ─────────────────────────────────────────── */
const Eyebrow = ({ text }: { text: string }) => (
  <div
    style={{
      display:       "inline-flex",
      alignItems:    "center",
      gap:           8,
      background:    "rgba(212,165,116,0.08)",
      border:        `1px solid rgba(212,165,116,0.2)`,
      borderRadius:  100,
      padding:       "5px 14px",
      fontSize:      11,
      fontWeight:    600,
      color:         C.gold,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom:  20,
    } as React.CSSProperties}
  >
    {text}
  </div>
);

export default Eyebrow;
