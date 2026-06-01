import { C, FONT_BODY } from "./tokens";

/* ─── Proof ticker items ────────────────────────────────────── */
const proofItems = [
  "Payment Gateway Integration",
  "WhatsApp Reminders",
  "Google Calendar Sync",
  "POPIA Compliant",
  "No Setup Fees",
  "Built for South African Businesses",
  "Real-time Revenue Intelligence",
  "AI-Powered Insights",
];

/* ─── ProofTicker ─────────────────────────────────────────── */
const ProofTicker = () => {
  /* Duplicate items so the scroll loop is seamless */
  const doubled = [...proofItems, ...proofItems];

  return (
    <div style={{
      borderTop:    `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      background:   C.s1,
      overflow:     "hidden",
      padding:      "14px 0",
    }}>
      <div className="proof-track" style={{ display: "flex", gap: 0 }}>
        {doubled.map((item, i) => (
          <div key={i} style={{
            display:       "inline-flex",
            alignItems:    "center",
            gap:           10,
            whiteSpace:    "nowrap",
            padding:       "0 32px",
            fontSize:      12,
            fontWeight:    500,
            color:         C.faint,
            fontFamily:    FONT_BODY,
            letterSpacing: "0.03em",
          }}>
            <span style={{
              width:        4,
              height:       4,
              borderRadius: "50%",
              background:   C.gold,
              flexShrink:   0,
              display:      "inline-block",
            }} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProofTicker;
