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

/* ─── FloatCard ──────────────────────────────────────────────── */
const FloatCard = ({
  card,
  containerRef,
  onDragUpdate,
  mobile,
}: {
  card: FloatCardData;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragUpdate: (id: number, x: number, y: number) => void;
  mobile: boolean;
}) => {
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if (mobile) return;
    isDragging.current = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    onDragUpdate(card.id, e.clientX - cr.left - dragOffset.current.x, e.clientY - cr.top - dragOffset.current.y);
  };
  const onPointerUp = () => { isDragging.current = false; };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position:       "absolute",
        left:           card.x,
        top:            card.y,
        width:          card.width,
        background:     "rgba(20,20,18,0.88)",
        border:         "1px solid rgba(255,255,255,0.09)",
        borderRadius:   mobile ? 10 : 14,
        padding:        mobile ? "8px 10px" : "12px 14px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow:      "0 16px 40px rgba(0,0,0,0.55)",
        cursor:         mobile ? "default" : "grab",
        userSelect:     "none",
        touchAction:    mobile ? "none" : "none",
        zIndex:         card.z,
        fontFamily:     FONT_BODY,
      }}
    >
      <div style={{ fontSize: mobile ? 7 : 8, letterSpacing: "0.14em", textTransform: "uppercase", color: C.faint, marginBottom: 2 }}>
        {card.label}
      </div>
      <div style={{ fontSize: mobile ? 14 : 17, fontWeight: 700, color: card.color, fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>
        {card.value}
      </div>
      <div style={{ fontSize: mobile ? 8 : 9, color: C.muted, marginTop: 2 }}>{card.sub}</div>
    </div>
  );
};

/* ─── Orb ────────────────────────────────────────────────────── */
const Orb = ({ scale = 1 }: { scale?: number }) => {
  const s = (v: number) => v * scale;
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: s(80), height: s(80), display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
      {[240, 380, 520].map((size, i) => (
        <div key={i} style={{
          position: "absolute", width: s(size), height: s(size), borderRadius: "50%",
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
        { anim: `dotOrbitA 2.8s linear infinite`,       tx: s(93) },
        { anim: `dotOrbitBm 4.2s linear infinite`,      tx: s(71) },
        { anim: `dotOrbitC 3.4s linear infinite 1.1s`,  tx: s(93) },
      ].map((d, i) => (
        <div key={i} style={{ position: "absolute", width: s(7), height: s(7), borderRadius: "50%", background: C.gold, boxShadow: `0 0 ${s(10)}px rgba(212,165,116,0.9)`, animation: d.anim, ["--orb-tx" as string]: `${d.tx}px` }} />
      ))}
    </div>
  );
};

/* ─── SpeechBubble ───────────────────────────────────────────── */
const SpeechBubble = ({ type, speaker, label, message, action, delay }: {
  type: "critical" | "growth" | "retention" | "ops";
  speaker: string;
  label: string;
  message: string;
  action: string;
  delay: number;
}) => {
  const colors: Record<string, string> = {
    critical:  C.red,
    growth:    C.em,
    retention: C.blue,
    ops:       C.amber,
  };
  const glows: Record<string, string> = {
    critical:  "rgba(255,87,87,0.18)",
    growth:    "rgba(52,211,153,0.18)",
    retention: "rgba(96,165,250,0.18)",
    ops:       "rgba(245,158,11,0.18)",
  };
  const borders: Record<string, string> = {
    critical:  "rgba(255,87,87,0.22)",
    growth:    "rgba(52,211,153,0.22)",
    retention: "rgba(96,165,250,0.22)",
    ops:       "rgba(245,158,11,0.22)",
  };
  const c   = colors[type];
  const g   = glows[type];
  const b   = borders[type];

  return (
    <div
      className={`speech-bubble speech-bubble--${type}`}
      style={{
        position:            "relative",
        background:          "rgba(16,15,14,0.72)",
        border:              `1px solid ${b}`,
        borderRadius:        18,
        borderBottomLeftRadius: 4,
        padding:             "18px 20px 16px",
        backdropFilter:      "blur(24px)",
        WebkitBackdropFilter:"blur(24px)",
        boxShadow:           `0 0 0 1px ${b}, 0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${g}`,
        animation:           `bubbleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
        fontFamily:          FONT_BODY,
      }}
    >
      {/* Tail */}
      <div style={{
        position:    "absolute",
        bottom:      -10,
        left:        22,
        width:       0,
        height:      0,
        borderLeft:  "10px solid transparent",
        borderRight: "0px solid transparent",
        borderTop:   `10px solid ${b}`,
        filter:      `drop-shadow(0 2px 4px ${g})`,
      }} />
      <div style={{
        position:    "absolute",
        bottom:      -8,
        left:        23,
        width:       0,
        height:      0,
        borderLeft:  "9px solid transparent",
        borderRight: "0px solid transparent",
        borderTop:   "9px solid rgba(16,15,14,0.72)",
      }} />

      {/* Speaker row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: `radial-gradient(circle at 32% 28%, rgba(255,240,180,0.6) 0%, transparent 40%), radial-gradient(circle, #D4A574 0%, #8a5b00 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 7, fontWeight: 700, color: "rgba(8,8,8,0.8)", letterSpacing: "0.04em",
          fontFamily: FONT_DISPLAY, flexShrink: 0,
          boxShadow: `0 0 8px rgba(212,165,116,0.5)`,
        }}>nx</div>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: FONT_DISPLAY }}>{speaker}</span>
          <span style={{ fontSize: 10, color: C.faint, marginLeft: 6 }}>· just now</span>
        </div>
        <div style={{
          marginLeft: "auto",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          color: c, background: `rgba(0,0,0,0.3)`, border: `1px solid ${b}`,
          padding: "2px 8px", borderRadius: 20,
        }}>{label}</div>
      </div>

      {/* Message */}
      <p style={{
        fontSize: 13, fontWeight: 300, color: C.text,
        lineHeight: 1.65, margin: 0, marginBottom: 12,
        fontStyle: "italic",
      }}>"{message}"</p>

      {/* Action */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, fontWeight: 600, color: c,
        cursor: "pointer", letterSpacing: "0.02em",
      }}>
        {action} →
      </div>
    </div>
  );
};

/* ─── InsightCard (used in Proactive Alerts section) ─────────── */
const InsightCard = ({ type, badge, message, action, delay }: {
  type: "critical" | "growth" | "retention" | "ops";
  badge: string; message: string; action: string; delay: number;
}) => {
  const colors: Record<string, string> = { critical: C.red, growth: C.em, retention: C.blue, ops: C.amber };
  const bgs:    Record<string, string> = { critical: "rgba(255,87,87,0.1)", growth: "rgba(52,211,153,0.1)", retention: "rgba(96,165,250,0.1)", ops: "rgba(245,158,11,0.1)" };
  const c = colors[type]; const bg = bgs[type];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.s2, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, animation: `fadeSlideIn 0.5s ease ${delay}s both`, fontFamily: FONT_BODY }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, color: c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {type === "critical"  && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
          {type === "growth"    && <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>}
          {type === "retention" && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
          {type === "ops"       && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
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

/* ─── Eyebrow pill ───────────────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════════
   INDEX PAGE
═══════════════════════════════════════════════════════════════ */
const Index = () => {
  const width        = useWindowWidth();
  const isMobile     = width < BP;
  const [activeFeature, setActiveFeature] = useState(0);
  const autoPlayRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const carouselRef  = useRef<HTMLDivElement>(null);

  const orbScale = isMobile ? 0.55 : 1;
  const cardWorldW = isMobile ? Math.min(width - 48, 340) : 480;
  const cardWorldH = isMobile ? 380 : 480;

  const makeCards = useCallback((mobile: boolean, cw: number): FloatCardData[] => {
    if (mobile) {
      return [
        { id: 0, x: 8,        y: 20,  z: 2, vx:  0.14, vy:  0.10, label: "Revenue today",     value: "R 1,950", sub: "7 bookings · 4 remaining",  color: C.gold,  width: 120 },
        { id: 1, x: cw - 128, y: 14,  z: 2, vx: -0.11, vy:  0.13, label: "Month progress",    value: "82%",     sub: "R 4,160 to beat last month", color: C.em,    width: 120 },
        { id: 2, x: 10,       y: 230, z: 2, vx:  0.10, vy: -0.14, label: "Cancellation rate", value: "22%",     sub: "Introduce a 30% deposit",   color: C.red,   width: 118 },
        { id: 3, x: cw - 126, y: 224, z: 2, vx: -0.12, vy: -0.11, label: "Open slots",        value: "14",      sub: "Filling 6 adds R 3,480",    color: C.blue,  width: 118 },
        { id: 4, x: cw/2 - 60,y: 320, z: 2, vx:  0.08, vy:  0.12, label: "Retention",         value: "38%",     sub: "Enrol 12 → hit 40%",        color: C.amber, width: 120 },
      ];
    }
    return [
      { id: 0, x: 18,  y: 40,  z: 2, vx:  0.18, vy:  0.12, label: "Revenue today",     value: "R 1,950",  sub: "7 bookings · 4 remaining",      color: C.gold,  width: 168 },
      { id: 1, x: 260, y: 20,  z: 2, vx: -0.14, vy:  0.16, label: "Month progress",    value: "82%",      sub: "R 4,160 to beat last month",     color: C.em,    width: 154 },
      { id: 2, x: 48,  y: 250, z: 2, vx:  0.12, vy: -0.18, label: "Cancellation rate", value: "22%",      sub: "Introduce a 30% deposit",        color: C.red,   width: 160 },
      { id: 3, x: 270, y: 230, z: 2, vx: -0.16, vy: -0.13, label: "Open slots · Thu",  value: "14",       sub: "Filling 6 adds R 3,480",         color: C.blue,  width: 156 },
      { id: 4, x: 140, y: 370, z: 2, vx:  0.10, vy:  0.15, label: "Retention",         value: "38%",      sub: "Enrol 12 regulars → hit 40%",    color: C.amber, width: 158 },
    ];
  }, []);

  const [cards, setCards] = useState<FloatCardData[]>(() => makeCards(false, 480));

  const prevMobileRef = useRef(false);
  useEffect(() => {
    const nowMobile = width < BP;
    if (nowMobile !== prevMobileRef.current) {
      prevMobileRef.current = nowMobile;
      setCards(makeCards(nowMobile, nowMobile ? Math.min(width - 48, 340) : 480));
    }
  }, [width, makeCards]);

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

  const handleDragUpdate = useCallback((id: number, x: number, y: number) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, x, y, vx: 0, vy: 0 } : c));
  }, []);

  const features = [
    { name: "Nexty AI" }, { name: "Smart Calendar" }, { name: "Client Management" },
    { name: "Loyalty Program" }, { name: "Stock & Inventory" }, { name: "Consultations" },
    { name: "Availability" }, { name: "Payments" }, { name: "Dashboard" },
  ];

  useEffect(() => {
    autoPlayRef.current = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 5000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [features.length]);

  const handleFeatureClick = (idx: number) => {
    setActiveFeature(idx);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 5000);
    if (isMobile && carouselRef.current) {
      const el = carouselRef.current.children[idx] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  useEffect(() => {
    if (!isMobile || !carouselRef.current) return;
    const el = carouselRef.current;
    const updateTilt = () => {
      const containerRect = el.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      Array.from(el.children).forEach((child, idx) => {
        const card = child as HTMLElement;
        const rect = card.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const offset = cardCenterX - centerX;
        const maxOffset = containerRect.width * 0.4;
        const ratio = Math.max(-1, Math.min(1, offset / maxOffset));
        const tilt = ratio * 15;
        card.style.transform = `rotateY(${tilt}deg)`;
        card.classList.remove("edge-left", "edge-right", "active-card");
        if (Math.abs(offset) < rect.width * 0.3) {
          card.classList.add("active-card");
          card.style.transform = "rotateY(0deg)";
        } else if (offset < 0) {
          card.classList.add("edge-left");
        } else {
          card.classList.add("edge-right");
        }
      });
      const cardW = el.scrollWidth / features.length;
      const idx = Math.round(el.scrollLeft / cardW);
      setActiveFeature(Math.min(Math.max(idx, 0), features.length - 1));
    };
    el.addEventListener("scroll", updateTilt, { passive: true });
    updateTilt();
    return () => el.removeEventListener("scroll", updateTilt);
  }, [isMobile, features.length]);

  const heatRows = [
    { day: "Mon", slots: [6,  9,  5,  7,  4] },
    { day: "Tue", slots: [2,  3,  2,  1,  2] },
    { day: "Wed", slots: [7, 11,  8,  9,  6] },
    { day: "Thu", slots: [4,  6,  5,  3,  4] },
    { day: "Fri", slots: [10,14, 12, 13,  9] },
    { day: "Sat", slots: [15,18, 16, 14, 11] },
    { day: "Sun", slots: [3,  4,  2,  2,  1] },
  ];

  const featurePanels: React.ReactNode[] = [
    /* 0 – Nexty AI */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>AI-POWERED</span>
        <span style={{ fontSize: 11, color: C.faint }}>Always learning</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Nexty AI Insights</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Proactive Critical, Growth, Retention, and Operations insights, ranked by rand impact. Your proactive intelligent business advisor, always on, never asleep.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { dot: C.red,  text: "Critical: 3 clients lapsed 14+ days. R1,200 at risk" },
          { dot: C.em,   text: "Growth: Tuesday 10–12pm converts 2.4× better. Add premium tier" },
          { dot: C.blue, text: "Retention: 48hr reminder clients return 3× more often" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.muted }}>{r.text}</span>
          </div>
        ))}
      </div>
    </div>,

    /* 1 – Smart Calendar */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>Live booking</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Smart Calendar</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Day, week, and month views. Mobile date strip. Payment status visible at a glance. Reschedule in two taps. Call-out bookings tracked separately.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { time: "09:00", name: "Amara Dube",    service: "Brazilian Blowout · 2h", status: "Paid",    sc: C.em },
          { time: "11:30", name: "Keitumetse M.", service: "Cut & Colour · 1.5h",    status: "Deposit", sc: C.gold },
          { time: "14:00", name: "Nandi Khumalo", service: "Knotless Braids · 3h",   status: "Pending", sc: C.amber },
        ].map((b, i) => (
          <div key={i} style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.faint, marginBottom: 3 }}>{b.time}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{b.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
              <span style={{ fontSize: 12, color: C.muted }}>{b.service}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: b.sc }}>{b.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>,

    /* 2 – Client Management */
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

    /* 3 – Loyalty */
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

    /* 4 – Stock */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>Real-time alerts</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Stock & Inventory</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Track products, reorder levels, and consumption per service. Stock alerts surface directly on your dashboard. Scan to update on the go.</p>
      {[
        { name: "Keratin Treatment 500ml", stock: "2 units left · Reorder at 3", status: "Low stock", sc: C.red },
        { name: "Olaplex No. 3 100ml",     stock: "12 units · Reorder at 4",     status: "In stock",  sc: C.em },
        { name: "Braid Spray 250ml",        stock: "7 units · Reorder at 3",      status: "In stock",  sc: C.em },
      ].map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}`, marginBotto