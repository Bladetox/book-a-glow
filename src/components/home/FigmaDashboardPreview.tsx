import { BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";

const BG = "#080909";
const PANEL = "#101212";
const LINE = "#272c29";
const WHITE = "#f4f4f1";
const MUTED = "#a3aaa5";
const DIM = "#737c76";
const GREEN = "#34d399";
const GREEN_DARK = "#24563f";

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, ...style }}>{children}</div>
);

const MetricCard = ({ label, value, context, accent = WHITE }: { label: string; value: string; context: string; accent?: string }) => (
  <Card style={{ minWidth: 0, height: 82, padding: "10px 12px", boxSizing: "border-box" }}>
    <div style={{ color: DIM, font: "600 9px Inter, sans-serif", letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</div>
    <div style={{ marginTop: 6, color: accent, font: "700 21px Montserrat, sans-serif", lineHeight: 1.1 }}>{value}</div>
    <div style={{ marginTop: 4, color: MUTED, font: "400 9px Inter, sans-serif" }}>{context}</div>
  </Card>
);

const Heatmap = () => {
  const colors = ["#1b2822", "#39875d", "#244332", "#173326", "#2d6548", "#1b2822", "#39875d", "#244332", "#173326", "#2d6548", "#1b2822", "#39875d"];
  return (
    <Card style={{ padding: 15 }}>
      <div style={{ color: WHITE, font: "600 13px Montserrat, sans-serif" }}>Booking heatmap</div>
      <div style={{ color: DIM, font: "10px Inter, sans-serif", marginTop: 5 }}>Booking activity by day and time</div>
      <div style={{ display: "grid", gridTemplateColumns: "18px repeat(12, minmax(0, 1fr))", gap: 4, marginTop: 16, alignItems: "center" }}>
        {["M","T","W","T","F","S","S"].map((day, row) => (
          <div key={`row-${row}`} style={{ display: "contents" }}>
            <span style={{ color: DIM, font: "8px Inter, sans-serif" }}>{day}</span>
            {colors.map((color, col) => (
              <span key={`${row}-${col}`} style={{ height: 9, borderRadius: 2, background: colors[(row * 3 + col) % colors.length] }} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
};

const MobileFrame = () => (
  <div style={{ width: 402, minHeight: 874, boxSizing: "border-box", overflow: "hidden", background: BG, color: WHITE, fontFamily: "Inter, sans-serif", border: `1px solid ${LINE}`, borderRadius: 54, border: "4px solid #69747b", boxShadow: "inset 0 0 0 2px #24292c", position: "relative" }}>
    <div aria-hidden="true" style={{ position: "absolute", zIndex: 2, top: 8, left: "50%", transform: "translateX(-50%)", width: 118, height: 25, background: "#000", borderRadius: 18 }} />
    <header style={{ height: 58, background: BG, borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", padding: "0 15px", gap: 15, boxSizing: "border-box" }}>
      <div style={{ width: 24, display: "flex", flexDirection: "column", gap: 5 }} aria-hidden="true">
        <span style={{ height: 1, background: MUTED, width: 16 }} />
        <span style={{ height: 1, background: MUTED, width: 12 }} />
        <span style={{ height: 1, background: MUTED, width: 16 }} />
      </div>
      <div style={{ flex: 1, font: "700 18px Montserrat, sans-serif" }}>Dashboard</div>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#28352e", display: "grid", placeItems: "center", color: WHITE, font: "600 10px Inter, sans-serif" }}>BV</div>
    </header>
    <main style={{ padding: "10px 12px 12px" }}>
      <div style={{ color: MUTED, font: "400 12px Inter, sans-serif", marginBottom: 10 }}>Your business at a glance</div>
      <Card style={{ padding: 12, marginBottom: 10 }}>
        <div style={{ color: DIM, font: "600 9px Inter, sans-serif", letterSpacing: ".08em" }}>THIS MONTH</div>
        <div style={{ marginTop: 5, font: "700 24px Montserrat, sans-serif" }}>R 18,420</div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 6, font: "400 9px Inter, sans-serif" }}>
          <span style={{ background: "#0c2d21", color: GREEN, padding: "6px 8px", borderRadius: 12 }}>↑ 18.6%</span>
          <span style={{ color: MUTED }}>vs previous month</span>
        </div>
        <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 8, paddingTop: 7, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: DIM, font: "400 10px Inter, sans-serif" }}>Projected month end</span>
          <strong style={{ color: GREEN, font: "600 14px Montserrat, sans-serif" }}>R 26,280</strong>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <MetricCard label="Today's bookings" value="8" context="2 remaining" />
        <MetricCard label="Fill rate" value="68%" context="+6% this month" accent={GREEN} />
        <MetricCard label="Returning clients" value="51%" context="Retention" />
        <MetricCard label="Avg. booking" value="R 620" context="Across 31 bookings" />
      </div>
      <section style={{ marginTop: 10 }}>
        <h3 style={{ margin: 0, font: "600 14px Montserrat, sans-serif" }}>Business health</h3>
        <p style={{ margin: "4px 0 7px", color: DIM, font: "400 10px Inter, sans-serif" }}>Understand the signals behind your bookings.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <MetricCard label="Fill rate" value="68%" context="Target 70%" accent={GREEN} />
          <MetricCard label="Cancellation rate" value="4.2%" context="↓ 1.1%" accent="#db7e32" />
          <MetricCard label="Avg. transaction" value="R 620" context="↑ 8.4%" />
          <MetricCard label="Client retention" value="35%" context="Returning clients" accent="#e03434" />
        </div>
      </section>
      <section style={{ marginTop: 10 }}>
        <Card style={{ padding: 15 }}>
          <div style={{ font: "600 13px Montserrat, sans-serif" }}>Revenue trend</div>
          <div style={{ marginTop: 5, color: DIM, font: "400 10px Inter, sans-serif" }}>Last 30 days</div>
          <div style={{ marginTop: 8, font: "700 22px Montserrat, sans-serif" }}>R 18,420</div>
          <div style={{ height: 84, display: "flex", alignItems: "flex-end", gap: 3, marginTop: 10, borderBottom: `1px solid ${LINE}` }}>
            {[23,35,30,43,28,52,37,59,44,40,66,49,53,42,70,52,60,47,64,54,45,68,51,60,71,53,58,49,67,62].map((h,i) => (
              <span key={i} style={{ flex: 1, height: h, minWidth: 0, borderRadius: "2px 2px 0 0", background: i === 24 ? GREEN : GREEN_DARK }} />
            ))}
          </div>
        </Card>
      </section>
      <section style={{ marginTop: 8 }}><Heatmap /></section>
    </main>
  </div>
);

const FigmaDashboardPreview = () => {
  const width = useWindowWidth();
  // Keep the entire phone visible at 280px on larger screens and scale down on narrow screens.
  const safeScale = Math.min(280 / 402, Math.max(0.2, (width - 24) / 402));
  return (
    <div style={{ width: "100%", minWidth: 0, display: "flex", justifyContent: "center", overflow: "visible" }}>
      <div style={{ width: 402 * safeScale, height: 874 * safeScale, overflow: "visible", flexShrink: 0 }}>
        <div style={{ width: 402, height: 874, transform: `scale(${safeScale})`, transformOrigin: "top left" }}>
          <MobileFrame />
        </div>
      </div>
    </div>
  );
};

export default FigmaDashboardPreview;
