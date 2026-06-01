import { C, FONT_BODY } from "./tokens";

const ITEMS = [
  "Payment Gateway Integration", "WhatsApp Reminders", "Google Calendar Sync",
  "POPIA Compliant", "No Setup Fees", "Built for South African Businesses",
  "Real-time Revenue Intelligence", "AI-Powered Insights",
];

export const ProofTicker = () => (
  <div style={{
    borderTop:    `1px solid ${C.border}`,
    borderBottom: `1px solid ${C.border}`,
    padding: "14px 0",
    overflow: "hidden",
    background: C.s1,
  }}>
    <div
      className="proof-track"
      style={{ display: "flex", gap: 0, width: "max-content" }}
    >
      {/* Duplicate items so the scroll loops seamlessly */}
      {[...ITEMS, ...ITEMS].map((item, i) => (
        <div key={i} style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "0 28px",
          fontFamily: FONT_BODY,
          fontSize: 12, fontWeight: 500,
          color: C.muted,
          whiteSpace: "nowrap",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: C.gold, display: "inline-block", flexShrink: 0,
          }} />
          {item}
        </div>
      ))}
    </div>
  </div>
);
