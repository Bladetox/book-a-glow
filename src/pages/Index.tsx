import { useState, useEffect, useRef, useCallback } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";

/* ─── Design tokens ──────────────────────────────────────────── */
const C = {
  bg:      "#080808",
  s1:      "#111110",
  s2:      "#181816",
  s3:      "#1e1d1b",
  border:  "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.10)",
  text:    "#e8e8e6",
  muted:   "rgba(232,232,230,0.52)",
  faint:   "rgba(232,232,230,0.28)",
  gold:    "#D4A574",
  goldDim: "#B8915F",
  em:      "#34d399",
  emDim:   "rgba(52,211,153,0.25)",
  red:     "#ff5757",
  blue:    "#60a5fa",
  amber:   "#f59e0b",
} as const;

const FONT_DISPLAY = "'Montserrat', sans-serif";
const FONT_BODY    = "'Inter', sans-serif";

/* ─── Types ──────────────────────────────────────────────────── */
interface FloatCardData {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  label: string;
  value: string;
  sub: string;
  color: string;
  width: number;
}

/* ─── FloatCard component ────────────────────────────────────── */
const FloatCard = ({
  card,
  containerRef,
  onDragUpdate,
}: {
  card: FloatCardData;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragUpdate: (id: number, x: number, y: number) => void;
}) => {
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const cardRef    = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const nx = e.clientX - containerRect.left - dragOffset.current.x;
    const ny = e.clientY - containerRect.top  - dragOffset.current.y;
    onDragUpdate(card.id, nx, ny);
  };

  const onPointerUp = () => { isDragging.current = false; };

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position:       "absolute",
        left:           card.x,
        top:            card.y,
        width:          card.width,
        background:     "rgba(20,20,18,0.88)",
        border:         `1px solid rgba(255,255,255,0.09)`,
        borderRadius:   16,
        padding:        "14px 16px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow:      "0 24px 64px rgba(0,0,0,0.6)",
        cursor:         "grab",
        userSelect:     "none",
        touchAction:    "none",
        zIndex:         card.z,
        fontFamily:     FONT_BODY,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.faint, marginBottom: 4 }}>
        {card.label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: card.color, fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>
        {card.value}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{card.sub}</div>
    </div>
  );
};

/* ─── Orb component ──────────────────────────────────────────── */
const Orb = () => (
  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
    {/* Aura layers */}
    {[240, 380, 520].map((size, i) => (
      <div key={i} style={{
        position: "absolute",
        width: size, height: size,
        borderRadius: "50%",
        background: i < 2
          ? `radial-gradient(circle, rgba(212,165,116,${i === 0 ? 0.14 : 0.05}) 0%, transparent ${i === 0 ? 65 : 60}%)`
          : `radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 55%)`,
        animation: `orbAuraPulse ${[3.5, 5.2, 7][i]}s ease-in-out infinite ${[0, 0.9, 1.8][i]}s`,
      }} />
    ))}
    {/* Spinning rings */}
    <div style={{ position: "absolute", width: 190, height: 190, borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(212,165,116,0.9)", borderRightColor: "rgba(212,165,116,0.28)", borderBottomColor: "rgba(212,165,116,0.04)", borderLeftColor: "rgba(212,165,116,0.28)", animation: "orbSpinA 2.8s linear infinite", filter: "drop-shadow(0 0 5px rgba(212,165,116,0.55))", pointerEvents: "none" }} />
    <div style={{ position: "absolute", width: 145, height: 145, borderRadius: "50%", border: "1px solid transparent", borderTopColor: "rgba(212,165,116,0.45)", borderRightColor: "rgba(212,165,116,0.1)", borderBottomColor: "transparent", borderLeftColor: "rgba(212,165,116,0.1)", animation: "orbSpinB 4.2s linear infinite", pointerEvents: "none" }} />
    {/* Sphere */}
    <div style={{
      position: "relative", width: 80, height: 80, borderRadius: "50%",
      background: "radial-gradient(circle at 30% 26%, rgba(255,242,185,0.92) 0%, transparent 36%), radial-gradient(circle at 50% 50%, #D4A574 0%, #B8915F 48%, #7a4200 100%)",
      boxShadow: "inset -3px -5px 12px rgba(0,0,0,0.6), inset 3px 3px 8px rgba(255,235,160,0.22), 0 8px 32px rgba(184,145,95,0.7), 0 2px 10px rgba(0,0,0,0.65)",
      animation: "orbBreathe 4s ease-in-out infinite",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ position: "absolute", width: 22, height: 13, background: "radial-gradient(ellipse, rgba(255,255,255,0.52) 0%, transparent 72%)", top: 13, left: 15, borderRadius: "50%", transform: "rotate(-22deg)" }} />
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 9, color: "rgba(8,8,8,0.75)", letterSpacing: "0.04em", position: "relative", zIndex: 1 }}>nexty</span>
    </div>
    {/* Orbiting dots */}
    {[
      { anim: "dotOrbitA 2.8s linear infinite" },
      { anim: "dotOrbitB 4.2s linear infinite reverse" },
      { anim: "dotOrbitC 3.4s linear infinite 1.1s" },
    ].map((d, i) => (
      <div key={i} style={{ position: "absolute", width: 7, height: 7, borderRadius: "50%", background: C.gold, boxShadow: `0 0 10px rgba(212,165,116,0.9)`, animation: d.anim }} />
    ))}
  </div>
);

/* ─── InsightCard component ──────────────────────────────────── */
const InsightCard = ({
  type, badge, message, action, delay,
}: { type: "critical"|"growth"|"retention"|"ops"; badge: string; message: string; action: string; delay: number }) => {
  const colors: Record<string, string> = { critical: C.red, growth: C.em, retention: C.blue, ops: C.amber };
  const bgs:    Record<string, string> = { critical: "rgba(255,87,87,0.1)", growth: "rgba(52,211,153,0.1)", retention: "rgba(96,165,250,0.1)", ops: "rgba(245,158,11,0.1)" };
  const c = colors[type];
  const bg = bgs[type];
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      background: C.s2, borderRadius: 14, padding: 16,
      border: `1px solid ${C.border}`,
      animation: `fadeSlideIn 0.5s ease ${delay}s both`,
      fontFamily: FONT_BODY,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, color: c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {type === "critical"   && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
          {type === "growth"     && <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>}
          {type === "retention"  && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
          {type === "ops"        && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: c, marginBottom: 3 }}>{badge}</div>
        <div style={{ fontSize: 13, fontWeight: 300, color: C.muted, lineHeight: 1.55 }}>{message}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: C.faint, marginTop: 6, cursor: "pointer" }}>{action} →</div>
      </div>
    </div>
  );
};

/* ─── HeatmapCell ────────────────────────────────────────────── */
const heatColor = (v: number) =>
  v < 4  ? "rgba(255,255,255,0.04)"
: v < 8  ? "rgba(212,165,116,0.18)"
: v < 12 ? "rgba(212,165,116,0.42)"
:          "rgba(212,165,116,0.72)";

/* ══════════════════════════════════════════════════════════════
   INDEX PAGE
══════════════════════════════════════════════════════════════ */
const Index = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const autoPlayRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);

  /* ── Floating cards state ─── */
  const [cards, setCards] = useState<FloatCardData[]>([
    { id: 0, x: 18,  y: 40,  z: 2, vx: 0.18, vy: 0.12, label: "Revenue today",       value: "R 1,950",  sub: "7 bookings · 4 remaining", color: C.gold,  width: 168 },
    { id: 1, x: 260, y: 20,  z: 2, vx:-0.14, vy: 0.16, label: "Month progress",      value: "82%",      sub: "R 4,160 to beat last month", color: C.em,  width: 154 },
    { id: 2, x: 48,  y: 250, z: 2, vx: 0.12, vy:-0.18, label: "Cancellation rate",   value: "22%",      sub: "↑ Introduce a deposit", color: C.red,    width: 160 },
    { id: 3, x: 270, y: 230, z: 2, vx:-0.16, vy:-0.13, label: "Open slots · Thu",    value: "14",       sub: "Add R 3,480 if filled",  color: C.blue,   width: 156 },
    { id: 4, x: 140, y: 370, z: 2, vx: 0.10, vy: 0.15, label: "Retention",           value: "38%",      sub: "Enrol 12 regulars → +2%", color: C.amber, width: 158 },
  ]);

  /* ── Animate cards ─── */
  const animate = useCallback(() => {
    setCards(prev => prev.map(c => {
      if (!containerRef.current) return c;
      const cw = containerRef.current.offsetWidth;
      const ch = containerRef.current.offsetHeight;
      let { x, y, vx, vy } = c;
      x += vx; y += vy;
      if (x < 0 || x + c.width > cw) { vx = -vx; x = Math.max(0, Math.min(x, cw - c.width)); }
      if (y < 0 || y + 80 > ch)       { vy = -vy; y = Math.max(0, Math.min(y, ch - 80)); }
      return { ...c, x, y, vx, vy };
    }));
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [animate]);

  const handleDragUpdate = useCallback((id: number, x: number, y: number) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, x, y, vx: 0, vy: 0 } : c));
  }, []);

  /* ── Feature autoplay ─── */
  const features = [
    { name: "Nexty AI Insights",     label: "AI-POWERED" },
    { name: "Smart Calendar",        label: "FULL FEATURE" },
    { name: "Client Management",     label: "FULL FEATURE" },
    { name: "Loyalty Program",       label: "NEXTY-POWERED" },
    { name: "Stock & Inventory",     label: "FULL FEATURE" },
    { name: "Consultation Forms",    label: "FULL FEATURE" },
    { name: "Availability Control",  label: "FULL FEATURE" },
    { name: "Payments + Deposits",   label: "SA PAYMENTS" },
    { name: "Dashboard",             label: "FULL FEATURE" },
  ];

  useEffect(() => {
    autoPlayRef.current = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 5000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [features.length]);

  const handleFeatureClick = (idx: number) => {
    setActiveFeature(idx);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 5000);
  };

  /* ── Heatmap data ─── */
  const heatRows = [
    { day: "Mon", slots: [6,  9,  5,  7,  4] },
    { day: "Tue", slots: [2,  3,  2,  1,  2] },
    { day: "Wed", slots: [7, 11,  8,  9,  6] },
    { day: "Thu", slots: [4,  6,  5,  3,  4] },
    { day: "Fri", slots: [10,14, 12, 13,  9] },
    { day: "Sat", slots: [15,18, 16, 14, 11] },
    { day: "Sun", slots: [3,  4,  2,  2,  1] },
  ];

  /* ── Feature detail content ─── */
  const featureContent: Record<number, React.ReactNode> = {
    0: (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>AI-POWERED · ALWAYS LEARNING</div>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>Nexty AI Insights</h3>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Proactive Critical, Growth, Retention, and Operations insights, ranked by rand impact. Your pro-active intelligent business advisor, always on, never asleep.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { dot: C.red,   text: "CRITICAL: 3 clients lapsed 14+ days. R1,200 at risk" },
            { dot: C.em,    text: "GROWTH: Tuesday 10–12pm converts 2.4× better. Add premium tier" },
            { dot: C.blue,  text: "RETENTION: Enrol top 12 unregistered regulars to hit 40% target" },
            { dot: C.amber, text: "OPS: Stock alert — 2 products below reorder level" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.muted }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    1: (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>FULL FEATURE · LIVE BOOKING</div>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>Smart Calendar</h3>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Day, week, and month views. Mobile date strip. Payment status visible at a glance. Reschedule in two taps. Call-out bookings tracked separately.</p>
        <div style={{ background: C.bg, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.faint, marginBottom: 8 }}>09:00</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Amara Dube</div>
          <div style={{ fontSize: 13, color: C.muted }}>Brazilian Blowout · 2h</div>
          <div style={{ fontSize: 11, color: C.em, marginTop: 6 }}>✓ Paid</div>
        </div>
      </div>
    ),
  };

  const defaultFeature = (idx: number) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>{features[idx].label}</div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>{features[idx].name}</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
        {[
          "Full client history, consultation forms, special occasions, blocked clients, and birthday alerts. Your clients, finally organised in one place.",
          "AI-suggested enrollment candidates. Configurable criteria. Bulk actions. Nexty tells you who's overdue and who to enrol next, before you even ask.",
          "Track products, reorder levels, and consumption per service. Stock alerts surface directly on your dashboard. Scan to update on the go.",
          "Custom intake forms per service, client health screening, consent records. All permanently attached to the client profile. POPIA compliant.",
          "Weekly recurring schedule plus daily overrides. Block days for holidays, events, or personal time. 30-minute slots from 06:00–23:00.",
          "Accept Yoco payments, partial deposits, and track outstanding balances — all per booking, all live in the dashboard. No chasing, no spreadsheets.",
          "Show or hide any section. Revenue graph, heatmap, stock alerts, client insights. Your dashboard, your way, saved per device.",
        ][idx - 2] ?? ""}
      </p>
    </div>
  );

  /* ── Comparison rows ─── */
  const comparisonRows = [
    ["Online booking page",                     "✓",           "✓"],
    ["Basic dashboard & stats",                 "✓",           "✓"],
    ["Revenue projection this month",           "—",           "✓"],
    ["Goal-gradient: R X to beat last month",   "—",           "✓"],
    ["Proactive AI business insights",          "—",           "✓ Nexty AI"],
    ["Booking heatmap (demand by day/time)",    "—",           "✓"],
    ["Inactive client alerts (90 days)",        "—",           "✓"],
    ["Loyalty with AI enrolment",               "Some tools",  "✓ AI-suggested"],
    ["Stock alerts on dashboard",               "—",           "✓"],
    ["Built for South African businesses",      "Rarely",      "✓ Yoco · ZAR · POPIA"],
  ];

  /* ── Proof ticker items ─── */
  const proofItems = [
    "PAYMENT GATEWAY INTEGRATION", "WHATSAPP REMINDERS", "GOOGLE CALENDAR SYNC",
    "POPIA COMPLIANT", "NO SETUP FEES", "BUILT FOR SOUTH AFRICA",
    "REAL-TIME REVENUE INTELLIGENCE", "AI-POWERED INSIGHTS",
  ];

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: FONT_BODY, minHeight: "100vh", overflowX: "hidden", WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>

      {/* ── Global keyframes ───────────────────────────────────── */}
      <style>{`
        @keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        @keyframes orbAuraPulse { 0%,100%{opacity:.5;transform:scale(1);} 50%{opacity:1;transform:scale(1.1);} }
        @keyframes orbSpinA  { to { transform:rotate(360deg);  } }
        @keyframes orbSpinB  { to { transform:rotate(-360deg); } }
        @keyframes orbBreathe{ 0%,100%{transform:scale(1);filter:brightness(1);} 50%{transform:scale(1.06);filter:brightness(1.14);} }
        @keyframes dotOrbitA { from{transform:rotate(0deg)   translateX(93px) rotate(0deg);}   to{transform:rotate(360deg) translateX(93px) rotate(-360deg);}   }
        @keyframes dotOrbitB { from{transform:rotate(70deg)  translateX(71px) rotate(-70deg);} to{transform:rotate(430deg) translateX(71px) rotate(-430deg);}   }
        @keyframes dotOrbitC { from{transform:rotate(200deg) translateX(93px) rotate(-200deg);}to{transform:rotate(560deg) translateX(93px) rotate(-560deg);}   }
        @keyframes heroBreathe{ 0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1);}   50%{opacity:1;transform:translate(-50%,-50%) scale(1.12);} }
        @keyframes proofScroll{ 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
        @keyframes pulseDot  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.4;transform:scale(.65);} }
        @keyframes fillBar   { to { width:82%; } }
        @keyframes orbBgPulse{ 0%,100%{transform:scale(1);opacity:.6;} 50%{transform:scale(1.2);opacity:1;} }
        @keyframes nextyOrbit{ from{transform:rotate(0deg);}   to{transform:rotate(360deg);}   }
        @keyframes nextyOrbitR{from{transform:rotate(0deg);}   to{transform:rotate(-360deg);}  }
        @keyframes nextyDot1 { from{transform:rotate(0deg)   translateX(97px) rotate(0deg);}   to{transform:rotate(360deg) translateX(97px) rotate(-360deg);}   }
        @keyframes nextyDot2 { from{transform:rotate(180deg) translateX(77px) rotate(-180deg);}to{transform:rotate(540deg) translateX(77px) rotate(-540deg);}   }
      `}</style>

      <SiteHeader />

      <main>
        {/* ══════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════ */}
        <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", background: C.bg }}>
          {/* Grid bg */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(rgba(212,165,116,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,165,116,0.03) 1px,transparent 1px)`,
            backgroundSize: "44px 44px",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
            maskImage:       "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
          } as React.CSSProperties} />
          {/* Glow */}
          <div style={{ position: "absolute", width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,165,116,0.07) 0%, transparent 70%)", top: "50%", left: "50%", animation: "heroBreathe 7s ease-in-out infinite", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", paddingTop: 80, width: "100%", maxWidth: 1120, margin: "0 auto", padding: "80px 24px 40px" }}>
            {/* Copy */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 28, animation: "fadeUp 0.6s ease both" } as React.CSSProperties}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block", animation: "pulseDot 2s ease-in-out infinite" }} />
                AI-POWERED · FOR BEAUTY PROS
              </div>

              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(36px,4.2vw,58px)", fontWeight: 700, color: C.text, marginBottom: 22, animation: "fadeUp 0.6s 0.1s ease both", lineHeight: 1.08 } as React.CSSProperties}>
                Your Dashboard<br />
                <span style={{ color: C.gold }}>That Talks Back</span>
              </h1>

              <p style={{ fontSize: "clamp(14px,1.3vw,16px)", fontWeight: 300, color: C.muted, lineHeight: 1.75, marginBottom: 36, maxWidth: 460, animation: "fadeUp 0.6s 0.2s ease both" } as React.CSSProperties}>
                Most platforms show you what's happened. NextSlot tells you what's happening.
                With proactive insights, real-time revenue intelligence, and alerts that surface
                opportunities before they're missed, you'll always know where to focus next.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", animation: "fadeUp 0.6s 0.3s ease both" } as React.CSSProperties}>
                <Link to="/onboarding" style={{ background: C.gold, color: "#080808", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, padding: "14px 30px", borderRadius: 10, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, minHeight: 48, transition: "opacity 0.15s, transform 0.15s" }}>
                  Start Free Trial →
                </Link>
                <Link to="/demo" style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: C.muted, textDecoration: "none", padding: "14px 4px", minHeight: 48, display: "inline-flex", alignItems: "center", gap: 6, transition: "color 0.15s" }}>
                  See it in action ↗
                </Link>
              </div>

              <p style={{ marginTop: 22, fontSize: 11, color: C.faint, letterSpacing: "0.04em", fontWeight: 500, animation: "fadeUp 0.6s 0.4s ease both" } as React.CSSProperties}>
                No Payment Required · 30-day trial · Set up in under 10 minutes
              </p>
            </div>

            {/* Card world */}
            <div ref={containerRef} style={{ position: "relative", width: "100%", height: 480, perspective: 900, userSelect: "none" }}>
              <Orb />
              {cards.map(card => (
                <FloatCard key={card.id} card={card} containerRef={containerRef} onDragUpdate={handleDragUpdate} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PROOF TICKER
        ══════════════════════════════════════════════════════ */}
        <div style={{ background: C.s1, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "18px 0", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 48, animation: "proofScroll 32s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
            {[...proofItems, ...proofItems].map((t, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, fontFamily: FONT_BODY }}>
                {t}
                {i < [...proofItems, ...proofItems].length - 1 && <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: C.border2, margin: "0 24px 0 0", verticalAlign: "middle" }} />}
              </span>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            NEXTY AI SECTION
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: `linear-gradient(180deg,${C.bg} 0%,${C.s1} 50%,${C.bg} 100%)`, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 } as React.CSSProperties}>
                NEXTY AI · BUSINESS GROWTH ADVISOR
              </div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                A business advisor<br />built into <span style={{ color: C.gold }}>every screen.</span>
              </h2>
              <p style={{ fontSize: 16, color: C.muted, maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>
                Every time you open your dashboard, Nexty scans your bookings, revenue,
                retention, and capacity — then tells you exactly what's holding you back and what to do about it.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
              {/* Orb stage */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", height: 340 }}>
                <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(212,165,116,0.12) 0%,transparent 65%)", animation: "orbBgPulse 3.5s ease-in-out infinite" }} />
                <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(212,165,116,0.9)", borderRightColor: "rgba(212,165,116,0.3)", borderBottomColor: "rgba(212,165,116,0.05)", borderLeftColor: "rgba(212,165,116,0.3)", animation: "nextyOrbit 2.4s linear infinite", filter: "drop-shadow(0 0 6px rgba(212,165,116,0.5))" }} />
                <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "1px solid rgba(212,165,116,0.15)", borderTopColor: "rgba(212,165,116,0.5)", animation: "nextyOrbitR 3.8s linear infinite" }} />
                <div style={{ position: "relative", width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%,rgba(255,240,180,0.85) 0%,transparent 40%),radial-gradient(circle at 50% 50%,#D4A574 0%,#B8915F 45%,#8a5b00 100%)", boxShadow: "inset -3px -4px 10px rgba(0,0,0,0.5),0 8px 32px rgba(184,145,95,0.55)", animation: "orbBreathe 4s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 11, color: "rgba(8,8,8,0.75)", letterSpacing: "0.04em" }}>nexty</span>
                </div>
                {[
                  { anim: "nextyDot1 2.4s linear infinite" },
                  { anim: "nextyDot2 3.8s linear infinite reverse" },
                ].map((d, i) => (
                  <div key={i} style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: C.gold, boxShadow: `0 0 10px rgba(212,165,116,0.8)`, animation: d.anim }} />
                ))}
              </div>

              {/* Insight cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <InsightCard type="critical"  badge="CRITICAL · IMPACT: R 4,800+"  message="Your cancellation rate jumped to 22%. At your current basket of R 580, every cancelled booking costs you R 580. Introduce a 30% deposit to protect revenue." action="Go to Settings" delay={0.1} />
                <InsightCard type="growth"    badge="GROWTH · CAPACITY OPPORTUNITY" message="You have 14 open slots on Thursday afternoons this month. Filling just 6 would add R 3,480. Consider a Thursday loyalty special." action="View heatmap" delay={0.3} />
                <InsightCard type="retention" badge="RETENTION · 38% RATE, BELOW TARGET" message="Enrolling your top 12 unregistered regulars in loyalty would push retention above the 40% benchmark within 30 days." action="Enrol now" delay={0.5} />
                <InsightCard type="ops"       badge="OPS · STOCK ALERT"             message="2 products are below reorder level. At current consumption, you'll run out before your next planned order arrives." action="View stock" delay={0.7} />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            REVENUE INTELLIGENCE
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: `linear-gradient(180deg,${C.bg} 0%,${C.s1} 100%)`, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 } as React.CSSProperties}>
                REVENUE INTELLIGENCE
              </div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                Not a report card.<br /><span style={{ color: C.gold }}>A running coach.</span>
              </h2>
              <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
                NextSlot doesn't just show you revenue — it contextualises every number, projects your month-end,
                and tells you exactly how far you are from beating last month.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Revenue card */}
              <div style={{ background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.faint, marginBottom: 8 }}>REVENUE THIS MONTH</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 46, fontWeight: 700, color: C.gold, lineHeight: 1, marginBottom: 8 }}>R 22,840</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Day 18 of 31 · 13 days remaining</div>
                <div style={{ fontSize: 15, color: C.text, marginBottom: 4 }}>On track for <strong>R 39,200</strong> by month-end</div>
                <div style={{ fontSize: 13, color: C.em }}>+23% vs last month</div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.gold, marginBottom: 6 }}>R 4,160 to beat last month · 82% there</div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: C.em, borderRadius: 99, width: 0, animation: "fillBar 2s 0.5s ease forwards" }} />
                  </div>
                </div>
              </div>

              {/* Stat tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "BOOKINGS",    value: "7",      sub: "today",     color: C.text },
                  { label: "REVENUE",     value: "R 1,950",sub: "paid in",   color: C.em   },
                  { label: "STILL TO COME",value:"4",      sub: "remaining", color: C.text },
                  { label: "NEXT CLIENT", value: "11:30",  sub: "Jess · Full Set", color: C.gold },
                ].map((t, i) => (
                  <div key={i} style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px" }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.faint, marginBottom: 6 }}>{t.label}</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: i === 3 ? 22 : 28, fontWeight: 700, color: t.color, lineHeight: 1, marginBottom: 4 }}>{t.value}</div>
                    <div style={{ fontSize: 10, color: C.faint }}>{t.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PROACTIVE ALERTS
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: C.bg, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 } as React.CSSProperties}>
              PROACTIVE ALERTS
            </div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 20 }}>
              If it's costing <span style={{ color: C.gold }}>you money</span>,<br />it should not be hiding.
            </h2>
            <p style={{ fontSize: 16, color: C.muted, maxWidth: 680, margin: "0 auto 48px", lineHeight: 1.7 }}>
              Your dashboard doesn't wait for you to notice problems. Overdue loyalty clients, 90-day inactive guests,
              birthday windows closing, rising cancellation rates. NextSlot surfaces all of it the moment you open the app.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, textAlign: "left" }}>
              {[
                { title: "Every alert is one tap from action",  body: "WhatsApp drafts pre-loaded, booking and payment links ready" },
                { title: "Client birthdays & occasions",        body: "Tracked automatically and surfaced when they matter" },
                { title: "Loyalty rewards tracked",             body: "Never miss a client who has earned a free treatment" },
              ].map((card, i) => (
                <div key={i} style={{ background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 16, padding: "20px 18px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>{card.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{card.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            BOOKING HEATMAP
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: `linear-gradient(180deg,${C.s1} 0%,${C.bg} 100%)`, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 } as React.CSSProperties}>
                BOOKING INTELLIGENCE
              </div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                Know when<br /><span style={{ color: C.gold }}>your clients want you.</span>
              </h2>
              <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
                The booking heatmap shows every day and time slot colour-coded by demand.
                Know your peaks. Fill your quiet slots. Never discount a prime window again.
              </p>
            </div>

            <div style={{ background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 20, padding: 28, overflowX: "auto" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.faint, marginBottom: 16 }}>BOOKING HEATMAP · THIS MONTH</div>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "4px", fontFamily: FONT_BODY }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }} />
                    {["08–10","10–12","12–14","14–16","16–18"].map(h => (
                      <th key={h} style={{ fontSize: 10, color: C.faint, fontWeight: 500, textAlign: "center", padding: "4px 8px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatRows.map(row => (
                    <tr key={row.day}>
                      <td style={{ fontSize: 11, fontWeight: 600, color: C.muted, paddingRight: 8 }}>{row.day}</td>
                      {row.slots.map((v, j) => (
                        <td key={j} style={{ textAlign: "center", padding: "3px 0" }}>
                          <div style={{ background: heatColor(v), borderRadius: 6, padding: "5px 8px", fontSize: 11, color: v >= 12 ? C.text : C.muted, fontWeight: v >= 8 ? 600 : 400 }}>{v}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 20, fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
                <span style={{ color: C.gold }}>Sat 10–12 is your busiest slot</span> — Never discount this.
                Tue afternoons are wide open — run a targeted offer or take the rest of the day off to recharge.
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FEATURE CAROUSEL
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: C.bg, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 } as React.CSSProperties}>
                EVERYTHING IN ONE PLACE
              </div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                The full stack for<br /><span style={{ color: C.gold }}>service businesses</span>
              </h2>
              <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
                Bookings, calendar, stock, loyalty, and intelligent insights — all inside one dashboard, all talking to each other.
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 24 }}>
              {features.map((f, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFeatureClick(idx)}
                  style={{
                    padding: "8px 16px", borderRadius: 100, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, cursor: "pointer", transition: "all 0.2s", border: "none",
                    background: activeFeature === idx ? C.gold : C.s2,
                    color:      activeFeature === idx ? "#080808" : C.muted,
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>

            {/* Feature panel */}
            <div style={{ background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 20, padding: 28 }}>
              {featureContent[activeFeature] ?? defaultFeature(activeFeature)}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            COMPARISON TABLE
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: `linear-gradient(180deg,${C.s1} 0%,${C.bg} 100%)`, padding: "96px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 } as React.CSSProperties}>
                WHY NEXTSLOT
              </div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08 }}>
                The dashboard others<br /><span style={{ color: C.gold }}>forgot to build.</span>
              </h2>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY, fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border2}` }}>
                    <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: C.text }}>Feature</th>
                    <th style={{ textAlign: "center", padding: "12px 16px", fontWeight: 600, color: C.muted }}>Other booking tools</th>
                    <th style={{ textAlign: "center", padding: "12px 16px", fontWeight: 600, color: C.gold }}>NextSlot</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 16px", color: C.muted }}>{row[0]}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: C.faint }}>{row[1]}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: C.gold }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: C.bg, padding: "96px 24px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.8vw,50px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 20 }}>
              Stop watching numbers.<br />Start <span style={{ color: C.gold }}>hearing</span> them.
            </h2>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 36 }}>
              Set up in under 10 minutes. Your booking page, your dashboard, and Nexty AI working for you from day one.
            </p>
            <Link
              to="/onboarding"
              style={{ display: "inline-flex", alignItems: "center", background: C.gold, color: "#080808", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, padding: "16px 38px", borderRadius: 12, textDecoration: "none", minHeight: 52, transition: "opacity 0.15s, transform 0.15s" }}
            >
              Start free. No payment needed →
            </Link>
            <p style={{ fontSize: 12, color: C.faint, marginTop: 20, letterSpacing: "0.04em" }}>
              30-day trial · No Payment required · Cancel anytime · Built for South Africa
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
