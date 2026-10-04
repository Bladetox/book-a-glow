import { TrendingUp, ArrowRight, CalendarDays } from "lucide-react";
import { DashboardIcon, BookingsIcon, ServicesIcon, ClientManagementIcon, SettingsIcon } from "@/components/icons/BrandIcons";

const mockServices = [
  { name: "Signature Facial", count: 12, revenue: "R 4,800" },
  { name: "Brow Shape & Tint", count: 9, revenue: "R 2,700" },
  { name: "Glow Facial", count: 7, revenue: "R 3,150" },
];

const nav = [
  { label: "Dashboard", active: true, Icon: DashboardIcon },
  { label: "Calendar", Icon: CalendarDays },
  { label: "Schedule", group: true, Icon: BookingsIcon },
  { label: "Catalogue", group: true, Icon: ServicesIcon },
  { label: "Clients", group: true, Icon: ClientManagementIcon },
  { label: "Business", group: true, Icon: SettingsIcon },
];

const MockBusinessLogo = ({ small = false }: { small?: boolean }) => (
  <div
    style={{
      width: small ? 26 : 36,
      height: small ? 26 : 36,
      borderRadius: small ? 8 : 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#efe7da",
      boxShadow: "inset 0 0 0 1px rgba(17,17,16,0.10)",
      flexShrink: 0,
    }}
    aria-hidden="true"
  >
    <svg width={small ? 16 : 22} height={small ? 16 : 22} viewBox="0 0 24 24" fill="none">
      <path d="M4 18.5V5.5h3.1l4.9 7.1 4.9-7.1H20v13h-3.2v-7.2l-4.8 6.7-4.8-6.7v7.2H4Z" fill="#1A1815"/>
      <circle cx="19.2" cy="5.2" r="2.1" fill="#B98955"/>
    </svg>
  </div>
);

const MiniMetric = ({ label, value, sub, tone = "neutral" }: {
  label: string; value: string; sub: string; tone?: "neutral" | "green" | "amber";
}) => (
  <div style={{
    padding: "12px 13px", borderRadius: 12,
    border: tone === "amber" ? "1px solid rgba(245,158,11,0.28)" : "1px solid rgba(255,255,255,0.07)",
    background: tone === "amber" ? "rgba(245,158,11,0.04)" : "rgba(255,255,255,0.025)",
  }}>
    <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>{label}</div>
    <div style={{ marginTop: 5, fontSize: 17, lineHeight: 1, fontWeight: 700, color: tone === "green" ? "#34d399" : tone === "amber" ? "#fbbf24" : "rgba(255,255,255,0.88)" }}>{value}</div>
    <div style={{ marginTop: 4, fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{sub}</div>
  </div>
);

const MarketingDashboardSnapshot = ({ scale = 1 }: { scale?: number }) => (
  <div
    aria-label="Example NextSlot dashboard for a fictional business"
    style={{
      width: 1000,
      height: 760,
      display: "flex",
      background: "#000", color: "#fff",
      overflow: "hidden",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      transform: `scale(${scale})`,
      transformOrigin: "top left",
    }}
  >
    <aside style={{ width: 256, flexShrink: 0, background: "#000", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 82, padding: "0 18px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <MockBusinessLogo />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>Studio M</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>Admin</div>
        </div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 3, padding: 10 }}>
        {nav.map(item => (
          <div key={item.label} style={{
            minHeight: 40, display: "flex", alignItems: "center", gap: 10, padding: "0 14px",
            borderRadius: 12, background: item.active ? "rgba(255,255,255,0.08)" : "transparent",
            color: item.active ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.40)",
            fontSize: 13, fontWeight: 500,
          }}>
            <item.Icon size={15} strokeWidth={1.7} aria-hidden="true" style={{ opacity: item.active ? 0.82 : 0.55, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.group && <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 16 }}>›</span>}
          </div>
        ))}
      </nav>
      <div style={{ marginTop: "auto", padding: 18 }}>
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 14 }} />
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>NextSlot</div>
      </div>
    </aside>

    <main style={{ flex: 1, minWidth: 0, background: "#000", display: "flex", flexDirection: "column" }}>
      <header style={{ height: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MockBusinessLogo small />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.78)" }}>Studio M</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Admin</div>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflow: "hidden", padding: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: "14px 17px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #fff0b4 0%, #d19900 52%, #8a5b00 100%)", boxShadow: "0 0 12px rgba(209,153,0,0.45)" }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>Nexty has insights for you</div>
                <div style={{ marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.30)" }}>Open Nexty to see your business analysis</div>
              </div>
            </div>
            <ArrowRight size={15} color="rgba(255,255,255,0.25)" />
          </div>

          <section style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Revenue This Month</div>
                <div style={{ marginTop: 7, fontSize: 30, lineHeight: 1, fontWeight: 700 }}>R 18,420</div>
                <div style={{ marginTop: 7, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Day 21 of 31 · 10 days remaining</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7, color: "#34d399", fontSize: 11, fontWeight: 600 }}><TrendingUp size={13} />12% vs last month</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32, paddingTop: 3 }}>
                {[11,18,14,23,17,28,25].map((height, i) => <span key={i} style={{ width: 5, height, borderRadius: 3, background: i === 6 ? "#34d399" : "rgba(52,211,153,0.32)" }} />)}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ width: "82%", height: "100%", background: "#34d399", borderRadius: 4 }} /></div>
              <div style={{ marginTop: 5, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>R 4,020 to beat last month</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "17px 0 11px" }}>
              <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }} /><span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.20)" }}>Today</span><span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }}>
              <MiniMetric label="Bookings Today" value="6" sub="appointments" />
              <MiniMetric label="Still to Come" value="4" sub="remaining" tone="amber" />
              <MiniMetric label="Revenue Today" value="R 2,480" sub="paid in" tone="green" />
              <MiniMetric label="Next Client" value="14:00" sub="Brow & Skin" />
            </div>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <section>
              <div style={{ marginBottom: 10, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Business Health</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                <MiniMetric label="Fill Rate" value="68%" sub="below target" tone="amber" />
                <MiniMetric label="Avg. Basket" value="R 410" sub="per appointment" />
                <MiniMetric label="Clients" value="42" sub="unique this month" />
                <MiniMetric label="Returning" value="17" sub="this month" tone="green" />
              </div>
            </section>
            <section>
              <div style={{ marginBottom: 10, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Top Services</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {mockServices.map((service, i) => (
                  <div key={service.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 0", borderBottom: i < mockServices.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ width: 16, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.20)" }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.76)" }}>{service.name}</div>
                      <div style={{ marginTop: 3, fontSize: 9, color: "rgba(255,255,255,0.30)" }}>{service.count} bookings</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(52,211,153,0.82)" }}>{service.revenue}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
);

export default MarketingDashboardSnapshot;
