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
const BP           = 768;

/* ─── useWindowWidth ─────────────────────────────────────────── */
const useWindowWidth = () => {
  const [w, setW] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
};

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

/* ─── FloatCard component (no drag) ─────────────────────────── */
const FloatCard = ({ card }: { card: FloatCardData }) => (
  <div
    style={{
      position:       "absolute",
      left:           card.x,
      top:            card.y,
      width:          card.width,
      background:     "rgba(20,20,18,0.88)",
      border:         "1px solid rgba(255,255,255,0.09)",
      borderRadius:   14,
      padding:        "12px 14px",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow:      "0 24px 64px rgba(0,0,0,0.6)",
      userSelect:     "none",
      zIndex:         card.z,
      fontFamily:     FONT_BODY,
      pointerEvents:  "none",
    }}
  >
    <div style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: C.faint, marginBottom: 3 }}>
      {card.label}
    </div>
    <div style={{ fontSize: 17, fontWeight: 700, color: card.color, fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>
      {card.value}
    </div>
    <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{card.sub}</div>
  </div>
);

/* ─── Orb component ──────────────────────────────────────────── */
const Orb = ({ scale = 1 }: { scale?: number }) => {
  const s = (v: number) => v * scale;
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: s(80), height: s(80), display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
      {[240, 380, 520].map((size, i) => (
        <div key={i} style={{
          position: "absolute",
          width: s(size), height: s(size),
          borderRadius: "50%",
          background: i < 2
            ? `radial-gradient(circle, rgba(212,165,116,${i === 0 ? 0.14 : 0.05}) 0%, transparent ${i === 0 ? 65 : 60}%)`
            : `radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 55%)`,
          animation: `orbAuraPulse ${[3.5, 5.2, 7][i]}s ease-in-out infinite ${[0, 0.9, 1.8][i]}s`,
        }} />
      ))}
      <div style={{ position: "absolute", width: s(190), height: s(190), borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(212,165,116,0.9)", borderRightColor: "rgba(212,165,116,0.28)", borderBottomColor: "rgba(212,165,116,0.04)", borderLeftColor: "rgba(212,165,116,0.28)", animation: "orbSpinA 2.8s linear infinite", filter: "drop-shadow(0 0 5px rgba(212,165,116,0.55))", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: s(145), height: s(145), borderRadius: "50%", border: "1px solid transparent", borderTopColor: "rgba(212,165,116,0.45)", borderRightColor: "rgba(212,165,116,0.1)", borderBottomColor: "transparent", borderLeftColor: "rgba(212,165,116,0.1)", animation: "orbSpinB 4.2s linear infinite", pointerEvents: "none" }} />
      <div style={{
        position: "relative", width: s(80), height: s(80), borderRadius: "50%",
        background: "radial-gradient(circle at 30% 26%, rgba(255,242,185,0.92) 0%, transparent 36%), radial-gradient(circle at 50% 50%, #D4A574 0%, #B8915F 48%, #7a4200 100%)",
        boxShadow: "inset -3px -5px 12px rgba(0,0,0,0.6), inset 3px 3px 8px rgba(255,235,160,0.22), 0 8px 32px rgba(184,145,95,0.7), 0 2px 10px rgba(0,0,0,0.65)",
        animation: "orbBreathe 4s ease-in-out infinite",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ position: "absolute", width: s(22), height: s(13), background: "radial-gradient(ellipse, rgba(255,255,255,0.52) 0%, transparent 72%)", top: s(13), left: s(15), borderRadius: "50%", transform: "rotate(-22deg)" }} />
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: s(9), color: "rgba(8,8,8,0.75)", letterSpacing: "0.04em", position: "relative", zIndex: 1 }}>nexty</span>
      </div>
      {[
        { anim: "dotOrbitA 2.8s linear infinite",        tx: s(93) },
        { anim: "dotOrbitBm 4.2s linear infinite",       tx: s(71) },
        { anim: "dotOrbitC 3.4s linear infinite 1.1s",   tx: s(93) },
      ].map((d, i) => (
        <div key={i} style={{ position: "absolute", width: s(7), height: s(7), borderRadius: "50%", background: C.gold, boxShadow: `0 0 ${s(10)}px rgba(212,165,116,0.9)`, animation: d.anim, ["--orb-tx" as string]: `${d.tx}px` }} />
      ))}
    </div>
  );
};

/* ─── InsightCard ─────────────────────────────────────────────── */
const InsightCard = ({
  type, badge, message, action, delay,
}: { type: "critical"|"growth"|"retention"|"ops"; badge: string; message: string; action: string; delay: number }) => {
  const colors: Record<string, string> = { critical: C.red, growth: C.em, retention: C.blue, ops: C.amber };
  const bgs:    Record<string, string> = { critical: "rgba(255,87,87,0.1)", growth: "rgba(52,211,153,0.1)", retention: "rgba(96,165,250,0.1)", ops: "rgba(245,158,11,0.1)" };
  const c  = colors[type];
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

/* ─── Eyebrow pill ─────────────────────────────────────────────── */
const Eyebrow = ({ text }: { text: string }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 } as React.CSSProperties}>
    {text}
  </div>
);

/* ─── Heatmap colour ─────────────────────────────────────────── */
const heatColor = (v: number) =>
  v < 4  ? "rgba(255,255,255,0.04)"
: v < 8  ? "rgba(212,165,116,0.18)"
: v < 12 ? "rgba(212,165,116,0.42)"
:          "rgba(212,165,116,0.72)";

/* ══════════════════════════════════════════════════════════════
   INDEX PAGE
══════════════════════════════════════════════════════════════ */
const Index = () => {
  const width           = useWindowWidth();
  const isMobile        = width < BP;
  const [activeFeature, setActiveFeature] = useState(0);
  const autoPlayRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const rafRef          = useRef<number>(0);
  const carouselRef     = useRef<HTMLDivElement>(null);

  /* ── Mobile orb scale ─── */
  const orbScale = isMobile ? 0.55 : 1;

  /* ── Floating cards init: different positions for mobile vs desktop ── */
  const makeCards = useCallback((mobile: boolean): FloatCardData[] => {
    if (mobile) {
      // Smaller container ~(screenWidth-48) × 360, cards narrower
      const cw = Math.min(width - 48, 340);
      return [
        { id: 0, x: 8,       y: 20,  z: 2, vx:  0.14, vy:  0.10, label: "Revenue today",     value: "R 1,950", sub: "7 bookings · 4 remaining",        color: C.gold,  width: 120 },
        { id: 1, x: cw-128,  y: 14,  z: 2, vx: -0.11, vy:  0.13, label: "Month progress",    value: "82%",     sub: "R 4,160 to beat last month",       color: C.em,    width: 120 },
        { id: 2, x: 10,      y: 220, z: 2, vx:  0.10, vy: -0.14, label: "Cancellation rate", value: "22%",     sub: "Introduce a 30% deposit",          color: C.red,   width: 118 },
        { id: 3, x: cw-126,  y: 216, z: 2, vx: -0.12, vy: -0.11, label: "Open slots",        value: "14",      sub: "Filling 6 adds R 3,480",           color: C.blue,  width: 118 },
        { id: 4, x: cw/2-60, y: 310, z: 2, vx:  0.08, vy:  0.12, label: "Retention",         value: "38%",     sub: "Enrol 12 → hit 40%",               color: C.amber, width: 120 },
      ];
    }
    return [
      { id: 0, x: 18,  y: 40,  z: 2, vx:  0.18, vy:  0.12, label: "Revenue today",     value: "R 1,950",  sub: "7 bookings · 4 remaining",       color: C.gold,  width: 168 },
      { id: 1, x: 260, y: 20,  z: 2, vx: -0.14, vy:  0.16, label: "Month progress",    value: "82%",      sub: "R 4,160 to beat last month",       color: C.em,    width: 154 },
      { id: 2, x: 48,  y: 250, z: 2, vx:  0.12, vy: -0.18, label: "Cancellation rate", value: "22%",      sub: "Introduce a 30% deposit",          color: C.red,   width: 160 },
      { id: 3, x: 270, y: 230, z: 2, vx: -0.16, vy: -0.13, label: "Open slots · Thu",  value: "14",       sub: "Filling 6 adds R 3,480",           color: C.blue,  width: 156 },
      { id: 4, x: 140, y: 370, z: 2, vx:  0.10, vy:  0.15, label: "Retention",         value: "38%",      sub: "Enrol 12 regulars → hit 40% target",color: C.amber, width: 158 },
    ];
  }, [width]);

  const [cards, setCards] = useState<FloatCardData[]>(() => makeCards(false));

  /* Reset cards when crossing breakpoint */
  const prevMobileRef = useRef(false);
  useEffect(() => {
    const nowMobile = width < BP;
    if (nowMobile !== prevMobileRef.current) {
      prevMobileRef.current = nowMobile;
      setCards(makeCards(nowMobile));
    }
  }, [width, makeCards]);

  /* ── RAF animation loop ─── */
  const animate = useCallback(() => {
    setCards(prev => prev.map(c => {
      if (!containerRef.current) return c;
      const cw = containerRef.current.offsetWidth;
      const ch = containerRef.current.offsetHeight;
      let { x, y, vx, vy } = c;
      x += vx; y += vy;
      if (x < 0 || x + c.width > cw) { vx = -vx; x = Math.max(0, Math.min(x, cw - c.width)); }
      if (y < 0 || y + 72 > ch)       { vy = -vy; y = Math.max(0, Math.min(y, ch - 72)); }
      return { ...c, x, y, vx, vy };
    }));
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [animate]);

  /* ── Feature tabs ─── */
  const features = [
    { name: "Nexty AI",          label: "AI-POWERED",     sub: "Proactive insights" },
    { name: "Smart Calendar",    label: "FULL FEATURE",   sub: "Bookings & schedule" },
    { name: "Client Management", label: "FULL FEATURE",   sub: "Profiles & history" },
    { name: "Loyalty Program",   label: "NEXTY-POWERED",  sub: "AI-powered rewards" },
    { name: "Stock & Inventory", label: "FULL FEATURE",   sub: "Products & alerts" },
    { name: "Consultations",     label: "FULL FEATURE",   sub: "Forms & consent" },
    { name: "Availability",      label: "FULL FEATURE",   sub: "Schedule control" },
    { name: "Payments",          label: "SA PAYMENTS",    sub: "Yoco + deposits" },
    { name: "Dashboard",         label: "FULL FEATURE",   sub: "Your way" },
  ];

  useEffect(() => {
    autoPlayRef.current = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 5000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [features.length]);

  const handleFeatureClick = (idx: number) => {
    setActiveFeature(idx);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 5000);
    /* Scroll carousel to the clicked card on mobile */
    if (isMobile && carouselRef.current) {
      const el = carouselRef.current.children[idx] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  /* ── Carousel scroll → update active on mobile ─── */
  useEffect(() => {
    if (!isMobile || !carouselRef.current) return;
    const el = carouselRef.current;
    const onScroll = () => {
      const cardW = el.scrollWidth / features.length;
      const idx = Math.round(el.scrollLeft / cardW);
      setActiveFeature(Math.min(Math.max(idx, 0), features.length - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isMobile, features.length]);

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

  /* ── Feature panel content ─── */
  const featurePanels: React.ReactNode[] = [
    /* 0 ─ Nexty AI */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>AI-POWERED</span>
        <span style={{ fontSize: 11, color: C.faint }}>Always learning</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Nexty AI Insights</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Proactive Critical, Growth, Retention, and Operations insights, ranked by rand impact. Your Pro-active Intelligent business advisor, always on, never asleep.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { dot: C.red,   text: "Critical: 3 clients lapsed 14+ days. R1,200 at risk" },
          { dot: C.em,    text: "Growth: Tuesday 10–12pm converts 2.4× better. Add premium tier" },
          { dot: C.blue,  text: "Retention: 48hr reminder clients return 3× more often" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.muted }}>{r.text}</span>
          </div>
        ))}
      </div>
    </div>,

    /* 1 ─ Smart Calendar */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>Live booking</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Smart Calendar</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Day, week, and month views. Mobile date strip. Payment status visible at a glance. Reschedule in two taps. Call-out bookings tracked separately.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { time: "09:00", name: "Amara Dube",    service: "Brazilian Blowout · 2h",  status: "Paid",    statusColor: C.em },
          { time: "11:30", name: "Keitumetse M.", service: "Cut & Colour · 1.5h",     status: "Deposit", statusColor: C.gold },
          { time: "14:00", name: "Nandi Khumalo", service: "Knotless Braids · 3h",   status: "Pending", statusColor: C.amber },
        ].map((b, i) => (
          <div key={i} style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.faint, marginBottom: 3 }}>{b.time}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{b.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
              <span style={{ fontSize: 12, color: C.muted }}>{b.service}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: b.statusColor }}>{b.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>,

    /* 2 ─ Client Management */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>Full history</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Client Management</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Full client history, consultation forms, special occasions, blocked clients, and birthday alerts. Your clients, finally organised in one place.</p>
      <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#080808" }}>A</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Amara Dube</div>
            <div style={{ fontSize: 11, color: C.faint }}>Client since Jan 2024 · 24 visits</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, background: "rgba(212,165,116,0.12)", color: C.gold, padding: "3px 8px", borderRadius: 6 }}>VIP</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[{ label: "Visits", value: "24" }, { label: "Spent", value: "R 8 640" }, { label: "Rating", value: "4.9★" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.faint }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>,

    /* 3 ─ Loyalty */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>NEXTY-POWERED</span>
        <span style={{ fontSize: 11, color: C.faint }}>AI-suggested</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Loyalty Program</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>AI-suggested enrollment candidates. Configurable criteria. Bulk actions. Nexty tells you who's overdue and who to enrol next, before you even ask.</p>
      <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>Nexty recommends enrolling</div>
      {[
        { initial: "K", name: "Keitumetse M.", sub: "8 visits · R 3 200 spent" },
        { initial: "N", name: "Nandi Khumalo",  sub: "6 visits · R 2 800 spent" },
      ].map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}`, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.s3, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: C.muted }}>{r.initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</div>
            <div style={{ fontSize: 11, color: C.faint }}>{r.sub}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.gold, cursor: "pointer" }}>Enrol →</span>
        </div>
      ))}
    </div>,

    /* 4 ─ Stock */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>Real-time alerts</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Stock & Inventory</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Track products, reorder levels, and consumption per service. Stock alerts surface directly on your dashboard. Scan to update on the go.</p>
      {[
        { name: "Keratin Treatment 500ml", stock: "2 units left · Reorder at 3",  status: "Low stock", statusColor: C.red },
        { name: "Olaplex No. 3 100ml",     stock: "12 units · Reorder at 4",      status: "In stock",  statusColor: C.em },
        { name: "Braid Spray 250ml",        stock: "7 units · Reorder at 3",       status: "In stock",  statusColor: C.em },
      ].map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}`, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
            <div style={{ fontSize: 11, color: C.faint }}>{p.stock}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: p.statusColor }}>{p.status}</span>
        </div>
      ))}
    </div>,

    /* 5 ─ Consultations */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>POPIA compliant</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Consultation Forms</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Custom intake forms per service, client health screening, consent records. All permanently attached to the client profile, accessible from any device.</p>
      <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 10 }}>Chemical Relaxer · Health Screen</div>
        {[
          { q: "Scalp sensitivity?", a: "No" },
          { q: "Previous relaxer?",  a: "Yes, 8 weeks" },
          { q: "Consent signed?",    a: "✓ Signed" },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, padding: "5px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
            <span>{row.q}</span>
            <span style={{ color: C.text, fontWeight: 500 }}>{row.a}</span>
          </div>
        ))}
      </div>
    </div>,

    /* 6 ─ Availability */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>Online bookings</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Availability Control</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Weekly recurring schedule plus daily overrides. Block days for holidays, events, or personal time. 30-minute slots from 06:00–23:00 with instant online booking.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 10 }}>
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, background: i === 6 ? "rgba(255,87,87,0.08)" : C.s2, border: `1px solid ${i === 6 ? "rgba(255,87,87,0.2)" : C.border}`, fontSize: 11, fontWeight: 600, color: i === 6 ? C.red : C.muted }}>{d}</div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.faint }}>Sunday blocked · 34 open slots this week</div>
    </div>,

    /* 7 ─ Payments */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>SA PAYMENTS</span>
        <span style={{ fontSize: 11, color: C.faint }}>Payment gateway</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Payments + Deposits</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Accept Yoco payments, partial deposits, and track outstanding balances, all per booking, all live in the dashboard. No chasing, no spreadsheets.</p>
      <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: C.faint }}>Today's payments</span>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.gold }}>R 3 240</span>
        </div>
        {[
          { name: "Amara Dube",    amount: "R 850 paid",     color: C.em },
          { name: "Keitumetse M.", amount: "R 200 deposit",  color: C.gold },
          { name: "Nandi Khumalo", amount: "R 1 200 pending",color: C.amber },
        ].map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, padding: "5px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
            <span>{p.name}</span>
            <span style={{ color: p.color, fontWeight: 600 }}>{p.amount}</span>
          </div>
        ))}
      </div>
    </div>,

    /* 8 ─ Dashboard */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>Your layout</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, colo