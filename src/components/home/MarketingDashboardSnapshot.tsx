import {
  CalendarCheck,
  CircleDollarSign,
  Clock3,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { C, FONT_BODY } from "./tokens";

const gold = "hsl(38 40% 58%)";

const navItems = [
  "Dashboard",
  "Calendar",
  "Bookings",
  "Services",
  "Availability",
  "Client Management",
];

const todayItems = [
  { label: "Bookings Today", value: "6", sub: "appointments" },
  { label: "Still to Come", value: "4", sub: "remaining", accent: true },
  { label: "Revenue Today", value: "R 2,480", sub: "paid in", positive: true },
  { label: "Next Client", value: "14:00", sub: "Brow & Skin", },
];

const services = [
  { name: "Signature Facial", count: 12, revenue: "R 4,800" },
  { name: "Brow Shape & Tint", count: 9, revenue: "R 2,700" },
  { name: "Glow Facial", count: 7, revenue: "R 3,150" },
];

const MarketingDashboardSnapshot = () => {
  return (
    <div
      aria-label="Example NextSlot dashboard"
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "112px minmax(0, 1fr)",
        background: "#080808",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
        fontFamily: FONT_BODY,
      }}
    >
      <aside
        style={{
          padding: "14px 9px",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "#050505",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 7px 16px" }}>
          <div
            style={{
              width: 19,
              height: 19,
              borderRadius: 6,
              background: "rgba(212,165,116,0.14)",
              border: "1px solid rgba(212,165,116,0.28)",
            }}
          />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>
            Next<span style={{ color: C.gold }}>Slot</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems.map((item, index) => (
            <div
              key={item}
              style={{
                padding: "7px 8px",
                borderRadius: 7,
                background: index === 0 ? "rgba(255,255,255,0.07)" : "transparent",
                color: index === 0 ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.34)",
                fontSize: 8.5,
                fontWeight: index === 0 ? 600 : 400,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </aside>

      <main style={{ minWidth: 0, background: "#090909" }}>
        <div
          style={{
            height: 42,
            padding: "0 15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.86)" }}>
            Dashboard
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
              }}
            />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.38)" }}>
              Studio M
            </span>
          </div>
        </div>

        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 11px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <span
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 32% 28%, #fff0b4 0%, #d19900 52%, #8a5b00 100%)",
                  boxShadow: "0 0 10px rgba(209,153,0,0.35)",
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>
                  Nexty has insights for you
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 7.5, color: "rgba(255,255,255,0.28)" }}>
                  Open Nexty to see your business analysis
                </p>
              </div>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>›</span>
          </div>

          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.02)",
              padding: 13,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 7.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
                  Revenue This Month
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 20, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.03em" }}>
                  R 18,420
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 7.5, color: "rgba(255,255,255,0.25)" }}>
                  Day 21 of 31 · 10 days remaining
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, color: "#34d399" }}>
                  <TrendingUp size={10} />
                  <span style={{ fontSize: 8, fontWeight: 600 }}>12% vs last month</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 2, paddingTop: 3 }}>
                {[8, 12, 9, 15, 13, 18, 17].map((height, index) => (
                  <span
                    key={index}
                    style={{
                      width: 3,
                      height,
                      borderRadius: 2,
                      background: index === 6 ? "#34d399" : "rgba(52,211,153,0.35)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, height: 3, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: "82%", height: "100%", borderRadius: 3, background: "#34d399" }} />
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 7, color: "rgba(255,255,255,0.24)" }}>
              R 4,020 to beat last month
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "11px 0 8px" }}>
              <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }} />
              <span style={{ fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.20)" }}>
                Today
              </span>
              <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 5 }}>
              {todayItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "7px 7px 6px",
                    borderRadius: 8,
                    border: item.accent ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(255,255,255,0.05)",
                    background: item.accent ? "rgba(245,158,11,0.04)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <span style={{ display: "block", fontSize: 6.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
                    {item.label}
                  </span>
                  <span style={{ display: "block", marginTop: 3, fontSize: 10, fontWeight: 700, color: item.positive ? "#34d399" : item.accent ? "#fbbf24" : "rgba(255,255,255,0.82)" }}>
                    {item.value}
                  </span>
                  <span style={{ display: "block", marginTop: 2, fontSize: 6.5, color: "rgba(255,255,255,0.20)" }}>
                    {item.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <p style={{ margin: "0 0 7px", fontSize: 7.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
                Business Health
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {[
                  { label: "Fill Rate", value: "68%", icon: CalendarCheck },
                  { label: "Avg. Basket", value: "R 410", icon: CircleDollarSign },
                  { label: "Clients", value: "42", icon: Users },
                  { label: "Returning", value: "17", icon: UserCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} style={{ padding: "8px 7px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)" }}>
                    <Icon size={9} style={{ color: "rgba(255,255,255,0.30)" }} />
                    <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>{value}</div>
                    <div style={{ marginTop: 2, fontSize: 6.5, color: "rgba(255,255,255,0.25)" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ margin: "0 0 7px", fontSize: 7.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
                Top Services
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {services.map((service, index) => (
                  <div key={service.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: index < services.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ width: 10, fontSize: 6.5, fontWeight: 700, color: "rgba(255,255,255,0.20)" }}>{index + 1}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 7.5, fontWeight: 600, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{service.name}</div>
                      <div style={{ marginTop: 2, fontSize: 6.5, color: "rgba(255,255,255,0.30)" }}>{service.count} bookings</div>
                    </div>
                    <span style={{ fontSize: 7.5, fontWeight: 600, color: "rgba(52,211,153,0.8)" }}>{service.revenue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 6,
              paddingTop: 4,
            }}
          >
            {[
              { label: "Client history", icon: Users },
              { label: "Payments", icon: CircleDollarSign },
              { label: "Availability", icon: Clock3 },
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <Icon size={9} style={{ color: gold, flexShrink: 0 }} />
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.42)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarketingDashboardSnapshot;
