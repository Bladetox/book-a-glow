import { FONT_BODY } from "./tokens";

const ITEMS = [
  "Local Payment Gateway Integration", "WhatsApp Reminders", "Google Calendar Sync",
  "POPIA Compliant", "No Setup Fees", "Built for South African Businesses",
  "Real-time Revenue Intelligence", "Intelligent Insights",
];

const GOLD = "#D4A574";

export const ProofTicker = () => (
  <div style={{
    borderTop:    "1px solid rgba(212,165,116,0.10)",
    borderBottom: "1px solid rgba(212,165,116,0.10)",
    padding: "14px 0",
    overflow: "hidden",
    background: "rgba(212,165,116,0.04)",
  }}>
    <div
      className="proof-track"
      style={{ display: "flex", gap: 0, width: "max-content" }}
    >
      {[...ITEMS, ...ITEMS].map((item, i) => (
        <div key={i} style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "0 28px",
          fontFamily: FONT_BODY,
          fontSize: 12, fontWeight: 500,
          color: "rgba(232,232,230,0.45)",
          whiteSpace: "nowrap",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: GOLD, display: "inline-block", flexShrink: 0,
          }} />
          {item}
        </div>
      ))}
    </div>
  </div>
);
