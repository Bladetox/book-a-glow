import { Menu, Bell, TrendingUp, ChevronRight, Info, Percent, XCircle, CircleDollarSign, UserCheck, UserPlus, Star, BarChart3 } from "lucide-react";
import {
  DashboardIcon,
  BookingsIcon,
  ServicesIcon,
  ClientManagementIcon,
  SettingsIcon,
} from "@/components/icons/BrandIcons";

const Metric = ({ label, value, sub, tone = "neutral" }: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "green" | "amber" | "red";
}) => (
  <div
    style={{
      minWidth: 0,
      padding: "10px 11px",
      borderRadius: 12,
      border: tone === "red"
        ? "1px solid rgba(239,68,68,0.45)"
        : tone === "amber"
          ? "1px solid rgba(245,158,11,0.30)"
          : "1px solid rgba(255,255,255,0.08)",
      background: tone === "red"
        ? "rgba(239,68,68,0.035)"
        : tone === "amber"
          ? "rgba(245,158,11,0.035)"
          : "rgba(255,255,255,0.018)",
    }}
  >
    <div style={{ fontSize: 7, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(255,255,255,0.27)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {label}
    </div>
    <div style={{
      marginTop: 4,
      fontSize: 14,
      lineHeight: 1,
      fontWeight: 700,
      color: tone === "green" ? "#34d399" : tone === "amber" ? "#fbbf24" : tone === "red" ? "#f87171" : "rgba(255,255,255,0.88)",
    }}>
      {value}
    </div>
    <div style={{ marginTop: 4, fontSize: 7, color: "rgba(255,255,255,0.22)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {sub}
    </div>
  </div>
);

const NavItem = ({ icon: Icon, label, active }: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) => (
  <div style={{
    position: "relative",
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  }}>
    {active && (
      <div style={{
        position: "absolute",
        inset: "6px 7px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.07)",
      }} />
    )}
    <Icon style={{ position: "relative", zIndex: 1, width: 16, height: 16, color: active ? "#fff" : "rgba(255,255,255,0.30)" }} />
    <span style={{ position: "relative", zIndex: 1, fontSize: 7, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,0.30)" }}>
      {label}
    </span>
  </div>
);

const MarketingMobileDashboardSnapshot = ({ scale = 1 }: { scale?: number }) => (
  <div
    style={{
      width: 390 * scale,
      height: 844 * scale,
      position: "relative",
      flexShrink: 0,
    }}
  >
    <div
      aria-label="Example NextSlot mobile dashboard for a fictional business"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 390,
        height: 844,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        borderRadius: 46,
      border: "2px solid rgba(175,195,210,0.72)",
      boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
      background: "#000",
      color: "#fff",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}
  >
    <div aria-hidden="true" style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 132, height: 27, borderRadius: "0 0 16px 16px", background: "#000", zIndex: 5 }} />
    <div aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: 7, transform: "translateX(-50%)", width: 116, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.9)", zIndex: 5 }} />

    {/* Device status area, matching the real mobile capture */}
    <div style={{ height: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 13px", color: "rgba(255,255,255,0.78)", fontSize: 8, fontWeight: 600 }}>
      <span>5:30 PM</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 7 }}>
        <span>●●●</span>
        <span>Wi-Fi</span>
        <span>▮</span>
      </div>
    </div>

    {/* Real Admin mobile header structure */}
    <header style={{ height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 11px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <Menu size={15} color="rgba(255,255,255,0.42)" />
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>Dashboard</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: 7, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>SM</div>
          <span style={{ maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 8, color: "rgba(255,255,255,0.70)" }}>Studio M</span>
        </div>
        <div style={{ position: "relative" }}>
          <Bell size={14} color="rgba(255,255,255,0.48)" />
          <span style={{ position: "absolute", top: -4, right: -5, minWidth: 10, height: 10, borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>2</span>
        </div>
      </div>
    </header>

    {/* Same dashboard content order as the real AdminDashboard */}
    <main style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "11px 11px 10px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.018)", borderRadius: 12, padding: "9px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #fff0b4 0%, #d19900 52%, #8a5b00 100%)", boxShadow: "0 0 10px rgba(209,153,0,0.45)" }} />
            <div>
              <div style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>Nexty has insights for you</div>
              <div style={{ marginTop: 2, fontSize: 6.5, color: "rgba(255,255,255,0.30)" }}>Open Nexty to see your business analysis</div>
            </div>
          </div>
          <ChevronRight size={12} color="rgba(255,255,255,0.24)" />
        </div>

        <section style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.018)", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Revenue This Month</div>
              <div style={{ marginTop: 4, fontSize: 22, lineHeight: 1, fontWeight: 700 }}>R 18,420</div>
              <div style={{ marginTop: 5, fontSize: 7, color: "rgba(255,255,255,0.25)" }}>Day 21 of 31 · 10 days remaining</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, color: "#34d399", fontSize: 7.5, fontWeight: 600 }}>
                <TrendingUp size={9} />12% vs last month
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 24 }}>
              {[7,12,9,16,11,19,15].map((height, i) => (
                <span key={i} style={{ width: 3, height, borderRadius: 2, background: i === 6 ? "#34d399" : "rgba(52,211,153,0.32)" }} />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ height: 3, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: "82%", height: "100%", background: "#34d399", borderRadius: 4 }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 6.5, color: "rgba(255,255,255,0.24)" }}>R 4,020 to beat last month</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "10px 0 7px" }}>
            <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }} />
            <span style={{ fontSize: 6.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.20)" }}>Today</span>
            <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <Metric label="Bookings Today" value="6" sub="appointments" />
            <Metric label="Still to Come" value="4" sub="remaining" tone="amber" />
            <Metric label="Revenue Today" value="R 2,480" sub="paid in" tone="green" />
            <Metric label="Next Client" value="14:00" sub="Brow & Skin" />
          </div>
        </section>

        <section>
          <div style={{ marginBottom: 7, fontSize: 7, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Business Health</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <Metric label="Fill Rate" value="68%" sub="below target" tone="amber" />
            <Metric label="Cancellation" value="0%" sub="healthy" />
          </div>
        </section>

        <section style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "9px 10px", background: "rgba(255,255,255,0.012)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Efficiency</div>
            <Info size={10} color="rgba(255,255,255,0.22)" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 7 }}>
            <Metric label="Avg. Basket" value="R 410" sub="per appointment" />
            <Metric label="Clients" value="42" sub="this month" />
            <Metric label="Returning" value="17" sub="this month" tone="green" />
          </div>
        </section>

        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Top Services</div>
            <BarChart3 size={10} color="rgba(255,255,255,0.20)" />
          </div>
          {[
            ["Signature Facial", "12 bookings", "R 4,800"],
            ["Brow Shape & Tint", "9 bookings", "R 2,700"],
          ].map(([name, count, revenue], i) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 0", borderBottom: i === 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ width: 10, fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.20)" }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 7.5, fontWeight: 600, color: "rgba(255,255,255,0.76)" }}>{name}</div>
                <div style={{ marginTop: 2, fontSize: 6.5, color: "rgba(255,255,255,0.30)" }}>{count}</div>
              </div>
              <div style={{ fontSize: 7, fontWeight: 600, color: "rgba(52,211,153,0.82)" }}>{revenue}</div>
            </div>
          ))}
        </section>
      </div>
    </main>

    <nav style={{ height: 49, flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.07)", background: "#000", display: "flex", alignItems: "center", paddingBottom: 2 }}>
      <NavItem icon={DashboardIcon} label="Dashboard" active />
      <NavItem icon={BookingsIcon} label="Schedule" />
      <NavItem icon={ServicesIcon} label="Catalogue" />
      <NavItem icon={ClientManagementIcon} label="Clients" />
      <NavItem icon={SettingsIcon} label="Business" />
    </nav>
      </div>
    </div>
);

export default MarketingMobileDashboardSnapshot;
