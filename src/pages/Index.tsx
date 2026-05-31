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

  /* ── Orb scale ── */
  const orbScale = isMobile ? 0.55 : 1;

  /* ── Card world dimensions ── */
  const cardWorldW = isMobile ? Math.min(width - 48, 340) : 480;
  const cardWorldH = isMobile ? 380 : 480;

  /* ── Initial card positions ── */
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

  /* ── RAF bounce loop ── */
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

  /* ── Feature tabs ── */
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

  /* ── Carousel scroll → tilt effect + sync active ── */
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

  /* ── Heatmap ── */
  const heatRows = [
    { day: "Mon", slots: [6,  9,  5,  7,  4] },
    { day: "Tue", slots: [2,  3,  2,  1,  2] },
    { day: "Wed", slots: [7, 11,  8,  9,  6] },
    { day: "Thu", slots: [4,  6,  5,  3,  4] },
    { day: "Fri", slots: [10,14, 12, 13,  9] },
    { day: "Sat", slots: [15,18, 16, 14, 11] },
    { day: "Sun", slots: [3,  4,  2,  2,  1] },
  ];

  /* ── Feature panels ── */
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
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}`, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
            <div style={{ fontSize: 11, color: C.faint }}>{p.stock}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: p.sc }}>{p.status}</span>
        </div>
      ))}
    </div>,

    /* 5 – Consultations */
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

    /* 6 – Availability */
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

    /* 7 – Payments */
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
          { name: "Amara Dube",    amount: "R 850 paid",      color: C.em },
          { name: "Keitumetse M.", amount: "R 200 deposit",   color: C.gold },
          { name: "Nandi Khumalo", amount: "R 1 200 pending", color: C.amber },
        ].map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, padding: "5px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
            <span>{p.name}</span>
            <span style={{ color: p.color, fontWeight: 600 }}>{p.amount}</span>
          </div>
        ))}
      </div>
    </div>,

    /* 8 – Dashboard */
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
        <span style={{ fontSize: 11, color: C.faint }}>Your layout</span>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Customisable Dashboard</h3>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Show or hide any section. Revenue graph, heatmap, stock alerts, client insights. Your dashboard, your way, saved per device.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: "Revenue graph",  on: true },
          { label: "Heatmap",        on: true },
          { label: "Nexty insights", on: true },
          { label: "Stock alerts",   on: false },
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.muted }}>{t.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.on ? C.em : C.faint }}>{t.on ? "On" : "Off"}</span>
          </div>
        ))}
      </div>
    </div>,
  ];

  /* ── Comparison data ── */
  const compRows = [
    { feature: "Online booking page",                   them: "✓",          us: "✓",                   usOnly: false },
    { feature: "Basic dashboard & stats",               them: "✓",          us: "✓",                   usOnly: false },
    { feature: "Revenue projection this month",         them: "—",          us: "✓",                   usOnly: true  },
    { feature: "Goal-gradient: R X to beat last month", them: "—",          us: "✓",                   usOnly: true  },
    { feature: "Proactive AI business insights",        them: "—",          us: "✓ Nexty AI",           usOnly: true  },
    { feature: "Booking heatmap (demand by day/time)",  them: "—",          us: "✓",                   usOnly: true  },
    { feature: "Inactive client alerts (90 days)",      them: "—",          us: "✓",                   usOnly: true  },
    { feature: "Loyalty program with AI enrolment",     them: "Some tools", us: "✓ AI-suggested",      usOnly: true  },
    { feature: "Lead source / acquisition tracking",    them: "—",          us: "✓",                   usOnly: true  },
    { feature: "Stock alerts on dashboard",             them: "—",          us: "✓",                   usOnly: true  },
    { feature: "Built for South African businesses",    them: "Rarely",     us: "✓ Yoco · ZAR · POPIA",usOnly: true  },
  ];

  /* ── Proof ticker items ── */
  const proofItems = [
    "Payment Gateway Integration", "WhatsApp Reminders", "Google Calendar Sync",
    "POPIA Compliant", "No Setup Fees", "Built for South African Businesses",
    "Real-time Revenue Intelligence", "AI-Powered Insights",
  ];

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: FONT_BODY, minHeight: "100vh", overflowX: "hidden", WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>

      <style>{`
        @keyframes fadeUp        { from{opacity:0;transform:translateY(14px);}  to{opacity:1;transform:translateY(0);} }
        @keyframes fadeSlideIn   { from{opacity:0;transform:translateX(16px);}  to{opacity:1;transform:translateX(0);} }
        @keyframes bubbleIn      { from{opacity:0;transform:translateX(-12px) scale(0.96);} to{opacity:1;transform:translateX(0) scale(1);} }
        @keyframes orbAuraPulse  { 0%,100%{opacity:.5;transform:scale(1);}      50%{opacity:1;transform:scale(1.1);} }
        @keyframes orbSpinA      { to{transform:rotate(360deg);}  }
        @keyframes orbSpinB      { to{transform:rotate(-360deg);} }
        @keyframes orbBreathe    { 0%,100%{transform:scale(1);filter:brightness(1);}  50%{transform:scale(1.06);filter:brightness(1.14);} }
        @keyframes dotOrbitA     { from{transform:rotate(0deg)   translateX(var(--orb-tx,93px)) rotate(0deg);}    to{transform:rotate(360deg)  translateX(var(--orb-tx,93px)) rotate(-360deg);}  }
        @keyframes dotOrbitBm    { from{transform:rotate(70deg)  translateX(var(--orb-tx,71px)) rotate(-70deg);}  to{transform:rotate(430deg)  translateX(var(--orb-tx,71px)) rotate(-430deg);}  }
        @keyframes dotOrbitC     { from{transform:rotate(200deg) translateX(var(--orb-tx,93px)) rotate(-200deg);} to{transform:rotate(560deg)  translateX(var(--orb-tx,93px)) rotate(-560deg);}  }
        @keyframes heroBreathe   { 0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1);}  50%{opacity:1;transform:translate(-50%,-50%) scale(1.12);} }
        @keyframes proofScroll   { 0%{transform:translateX(0);}  100%{transform:translateX(-50%);} }
        @keyframes pulseDot      { 0%,100%{opacity:1;transform:scale(1);}  50%{opacity:.4;transform:scale(.65);} }
        @keyframes fillBar       { to{width:82%;} }
        @keyframes orbBgPulse    { 0%,100%{transform:scale(1);opacity:.6;}  50%{transform:scale(1.2);opacity:1;} }
        @keyframes nextyOrbit    { from{transform:rotate(0deg);}    to{transform:rotate(360deg);}  }
        @keyframes nextyOrbitR   { from{transform:rotate(0deg);}    to{transform:rotate(-360deg);} }
        @keyframes nextyDot1     { from{transform:rotate(0deg)   translateX(97px) rotate(0deg);}    to{transform:rotate(360deg)  translateX(97px) rotate(-360deg);}   }
        @keyframes nextyDot2     { from{transform:rotate(180deg) translateX(77px) rotate(-180deg);} to{transform:rotate(540deg)  translateX(77px) rotate(-540deg);}   }

        /* Carousel curved scroll */
        .feat-carousel {
          display: flex;
          overflow-x: scroll;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          gap: 16px;
          padding: 12px 24px 24px;
          perspective: 900px;
        }
        .feat-carousel::-webkit-scrollbar { display: none; }
        .feat-carousel-card {
          scroll-snap-align: center;
          flex: 0 0 82vw;
          max-width: 320px;
          background: #111110;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          padding: 24px;
          transform-origin: center center;
          transform: rotateY(0deg);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          will-change: transform;
        }
        .feat-carousel-card.edge-left  { transform: rotateY(15deg);  box-shadow: -6px 0 20px rgba(0,0,0,0.4); }
        .feat-carousel-card.edge-right { transform: rotateY(-15deg); box-shadow:  6px 0 20px rgba(0,0,0,0.4); }
        .feat-carousel-card.active-card { border-color: #B8915F; box-shadow: 0 0 0 1px #B8915F, 0 20px 40px rgba(0,0,0,0.5); }
      `}</style>

      <SiteHeader />

      <main>
        {/* ═════ HERO ═════ */}
        <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", background: C.bg }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(212,165,116,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,165,116,0.03) 1px,transparent 1px)`, backgroundSize: "44px 44px", WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)" } as React.CSSProperties} />
          <div style={{ position: "absolute", width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle,rgba(212,165,116,0.07) 0%,transparent 70%)", top: "50%", left: "50%", animation: "heroBreathe 7s ease-in-out infinite", pointerEvents: "none" }} />

          <div style={{
            position: "relative", zIndex: 2,
            display: isMobile ? "flex" : "grid",
            flexDirection: isMobile ? "column" : undefined,
            gridTemplateColumns: isMobile ? undefined : "1fr 1fr",
            gap: isMobile ? 32 : 64,
            alignItems: "center",
            width: "100%", maxWidth: 1120, margin: "0 auto",
            padding: isMobile ? "100px 24px 48px" : "100px 24px 48px",
          }}>
            {/* Copy */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,165,116,0.08)", border: `1px solid rgba(212,165,116,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 28, animation: "fadeUp 0.6s ease both" } as React.CSSProperties}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block", animation: "pulseDot 2s ease-in-out infinite" }} />
                AI-Powered · For Beauty Pros
              </div>

              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(32px,8vw,46px)" : "clamp(36px,4.2vw,58px)", fontWeight: 700, color: C.text, marginBottom: 22, animation: "fadeUp 0.6s 0.1s ease both", lineHeight: 1.08 } as React.CSSProperties}>
                Your dashboard<br />
                should be <span style={{ color: C.gold, fontStyle: "italic" }}>speaking.</span>
              </h1>

              <p style={{ fontSize: isMobile ? 14 : "clamp(14px,1.3vw,16px)", fontWeight: 300, color: C.muted, lineHeight: 1.75, marginBottom: 36, maxWidth: 460, animation: "fadeUp 0.6s 0.2s ease both" } as React.CSSProperties}>
                Most platforms show you what's happened. NextSlot tells you what's happening.
                With proactive insights, real-time revenue intelligence, and alerts that surface
                opportunities before they're missed, you'll always know where to focus next.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", animation: "fadeUp 0.6s 0.3s ease both" } as React.CSSProperties}>
                <Link to="/onboarding" style={{ background: C.gold, color: "#080808", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, padding: "14px 30px", borderRadius: 10, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, minHeight: 48 }}>
                  Start for free
                </Link>
                <a href="#nexty-section" style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: C.muted, textDecoration: "none", padding: "14px 4px", minHeight: 48, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  See how it works ↗
                </a>
              </div>

              <p style={{ marginTop: 22, fontSize: 11, color: C.faint, letterSpacing: "0.04em", fontWeight: 500, animation: "fadeUp 0.6s 0.4s ease both" } as React.CSSProperties}>
                No Payment Required · 30-day trial · Set up in under 10 minutes
              </p>
            </div>

            {/* Card world */}
            <div
              ref={containerRef}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: isMobile ? cardWorldW : "100%",
                margin: isMobile ? "0 auto" : undefined,
                height: cardWorldH,
                perspective: 900,
                userSelect: "none",
                flexShrink: 0,
              }}
            >
              <Orb scale={orbScale} />
              {cards.map(card => (
                <FloatCard
                  key={card.id}
                  card={card}
                  containerRef={containerRef}
                  onDragUpdate={handleDragUpdate}
                  mobile={isMobile}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ═════ PROOF TICKER ═════ */}
        <div style={{ background: C.s1, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "18px 0", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0, animation: "proofScroll 32s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
            {[...proofItems, ...proofItems].map((t, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, fontFamily: FONT_BODY, padding: "0 24px" }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* ═════ NEXTY AI ═════ */}
        <section id="nexty-section" style={{ background: `linear-gradient(180deg,${C.bg} 0%,${C.s1} 50%,${C.bg} 100%)`, padding: isMobile ? "64px 24px" : "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <Eyebrow text="Nexty AI · Business Growth Advisor" />
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                More personalised than<br /><span style={{ color: C.gold }}>most advisors.</span>
              </h2>
              <p style={{ fontSize: 16, color: C.muted, maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>
                Nexty is always learning your business: your peak times, your riskiest clients, your
                biggest opportunities. So when she speaks, it's not generic advice. It's yours.
              </p>
            </div>

            <div style={{
              display: isMobile ? "flex" : "grid",
              flexDirection: isMobile ? "column" : undefined,
              gridTemplateColumns: isMobile ? undefined : "340px 1fr",
              gap: isMobile ? 48 : 72,
              alignItems: "flex-start",
            }}>
              {/* Orb stage */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", height: isMobile ? 260 : 340, flexShrink: 0 }}>
                <div style={{ position: "absolute", width: isMobile ? 200 : 280, height: isMobile ? 200 : 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(212,165,116,0.12) 0%,transparent 65%)", animation: "orbBgPulse 3.5s ease-in-out infinite" }} />
                <div style={{ position: "absolute", width: isMobile ? 140 : 200, height: isMobile ? 140 : 200, borderRadius: "50%", border: "1.5px solid transparent", borderTopColor: "rgba(212,165,116,0.9)", borderRightColor: "rgba(212,165,116,0.3)", borderBottomColor: "rgba(212,165,116,0.05)", borderLeftColor: "rgba(212,165,116,0.3)", animation: "nextyOrbit 2.4s linear infinite", filter: "drop-shadow(0 0 6px rgba(212,165,116,0.5))" }} />
                <div style={{ position: "absolute", width: isMobile ? 110 : 160, height: isMobile ? 110 : 160, borderRadius: "50%", border: "1px solid rgba(212,165,116,0.15)", borderTopColor: "rgba(212,165,116,0.5)", animation: "nextyOrbitR 3.8s linear infinite" }} />
                <div style={{ position: "relative", width: isMobile ? 70 : 100, height: isMobile ? 70 : 100, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%,rgba(255,240,180,0.85) 0%,transparent 40%),radial-gradient(circle at 50% 50%,#D4A574 0%,#B8915F 45%,#8a5b00 100%)", boxShadow: "inset -3px -4px 10px rgba(0,0,0,0.5),0 8px 32px rgba(184,145,95,0.55)", animation: "orbBreathe 4s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 8 : 11, color: "rgba(8,8,8,0.75)", letterSpacing: "0.04em" }}>nexty</span>
                </div>
                {[{ anim: "nextyDot1 2.4s linear infinite" }, { anim: "nextyDot2 3.8s linear infinite reverse" }].map((d, i) => (
                  <div key={i} style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: C.gold, boxShadow: `0 0 10px rgba(212,165,116,0.8)`, animation: d.anim }} />
                ))}
              </div>

              {/* Speech bubbles */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ fontSize: 11, color: C.faint, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: C.gold, fontSize: 12 }}>Nexty AI</span>
                  <span style={{ fontSize: 10 }}>Updated just now · 4 insights</span>
                </div>

                <SpeechBubble
                  type="critical"
                  speaker="Nexty"
                  label="Critical"
                  message="Your cancellation rate hit 22% this month. That's R 580 walking out the door every single time. Turn on a 30% deposit. One tap in Settings and watch it drop."
                  action="Fix it now"
                  delay={0.1}
                />
                <SpeechBubble
                  type="growth"
                  speaker="Nexty"
                  label="Growth"
                  message="Thursday afternoons are basically empty. Great to take the rest of the day off to recharge or running a promo to increase bookings. Want me to suggest a promo?"
                  action="See the gap"
                  delay={0.25}
                />
                <SpeechBubble
                  type="retention"
                  speaker="Nexty"
                  label="Retention"
                  message="You're at 38% retention, just 2 points shy of the beauty benchmark. Your top 12 regulars aren't on loyalty yet. Enrol them today and you'll cross 40% within 30 days."
                  action="Enrol them"
                  delay={0.4}
                />
                <SpeechBubble
                  type="ops"
                  speaker="Nexty"
                  label="Operations"
                  message="Three products are below reorder: Hard Wax (2 left), Lash Glue (1 left), Tinting Developer (0 left). Don't let a last-minute stock-out cancel a booking."
                  action="Restock now"
                  delay={0.55}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═════ REVENUE INTELLIGENCE ═════ */}
        <section style={{ background: `linear-gradient(180deg,${C.bg} 0%,${C.s1} 100%)`, padding: isMobile ? "64px 24px" : "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <Eyebrow text="Revenue Intelligence" />
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                Not a report card.<br /><span style={{ color: C.gold }}>A running coach.</span>
              </h2>
              <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
                NextSlot doesn't just show you revenue, it contextualises every number, projects your month-end,
                and tells you exactly how far you are from beating last month.
              </p>
            </div>

            {/* Revenue card + tiles */}
            <div style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <div style={{ background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.faint, marginBottom: 8 }}>Revenue This Month</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 38 : 46, fontWeight: 700, color: C.gold, lineHeight: 1, marginBottom: 8 }}>R 22,840</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Day 18 of 31 · 13 days remaining</div>
                <div style={{ fontSize: 15, color: C.text, marginBottom: 4 }}>On track for <strong>R 39,200</strong> by month-end</div>
                <div style={{ fontSize: 13, color: C.em, marginBottom: 16 }}>+23% vs last month</div>
                <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.gold, marginBottom: 6 }}>R 4,160 to beat last month · 82% there</div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: C.em, borderRadius: 99, width: 0, animation: "fillBar 2s 0.5s ease forwards" }} />
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Bookings",      value: "7",       sub: "today",           color: C.text  },
                  { label: "Revenue",       value: "R 1,950", sub: "paid in",         color: C.em    },
                  { label: "Still to come", value: "4",       sub: "remaining",       color: C.text  },
                  { label: "Next client",   value: "11:30",   sub: "Jess · Full Set", color: C.gold  },
                ].map((t, i) => (
                  <div key={i} style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px" }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.faint, marginBottom: 6 }}>{t.label}</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: i === 3 ? 22 : 28, fontWeight: 700, color: t.color, lineHeight: 1, marginBottom: 4 }}>{t.value}</div>
                    <div style={{ fontSize: 10, color: C.faint }}>{t.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Intelligence callouts */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { title: "Live revenue projection",    body: "Based on your daily pace, NextSlot projects your month-end revenue in real time, so you know whether to push harder or coast to a record month.", quote: "\u201cOn track for R 39,200 this month\u201d" },
                { title: "Goal-gradient progress bar", body: "The dashboard shows you exactly how far you are from beating last month, down to the rand. That R 4,160 gap is the most motivating number on your screen.", quote: "\u201cR 4,160 to beat last month · 82% there\u201d" },
                { title: "Urgency signals at a glance",body: "Still no revenue by noon? All appointments complete before 5pm? NextSlot highlights the outlier in amber, the number that needs your attention right now.", quote: "\u201cStill to come: 4 remaining\u201d" },
              ].map((c, i) => (
                <div key={i} style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.65, marginBottom: 10 }}>{c.body}</div>
                  <div style={{ fontSize: 11, color: C.gold, fontStyle: "italic" }}>{c.quote}</div>
                </div>
              ))}
            </div>

            {/* Alert pills */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "High cancellation rate", sub: "22% this month, action needed",       color: C.red   },
                { label: "Inactive clients",        sub: "9 clients gone quiet · 90+ days",    color: C.amber },
                { label: "Overdue loyalty rewards", sub: "5 clients due for a stamp / reward",  color: C.blue  },
                { label: "Birthdays this week",     sub: "Thandi · Naledi, send a WhatsApp",    color: C.gold  },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: C.faint }}>{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.faint, fontStyle: "italic", textAlign: "center", marginBottom: 8 }}>
              "Other software waits for you to look. NextSlot flags it before it costs you."
            </div>
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>All alerts are one tap away from action.</div>
          </div>
        </section>

        {/* ═════ PROACTIVE ALERTS ═════ */}
        <section style={{ background: C.bg, padding: isMobile ? "64px 24px" : "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
            <Eyebrow text="Proactive Alerts" />
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 20 }}>
              If it's costing<br /><span style={{ color: C.gold }}>you money</span>, it should not be hiding.
            </h2>
            <p style={{ fontSize: 16, color: C.muted, maxWidth: 680, margin: "0 auto 48px", lineHeight: 1.7 }}>
              Stop hunting for problems. NextSlot surfaces the high-impact ones, ranked by rand value. 
              So every alert earns its place on your screen.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 16, textAlign: "left" }}>
              {[
                { type: "critical"  as const, badge: "Critical · Cancellations up 22%",   message: "You lost R 3,480 to cancellations this month. Introduce a 30% deposit to protect revenue. One setting change, instant effect.",                              action: "Enable deposits",  delay: 0   },
                { type: "growth"    as const, badge: "Growth · 14 open slots Thursday",    message: "Thursday afternoons are your emptiest window. At your current basket, filling 6 of those slots would add R 3,480 to this month's total.",                       action: "View heatmap",    delay: 0.1 },
                { type: "retention" as const, badge: "Retention · 9 clients gone quiet",   message: "9 clients haven't booked in 90+ days. A personalised WhatsApp to each one, sent from NextSlot, recovers 1 in 3. That's R 1,740 in potential revenue.",      action: "Send reminder",   delay: 0.2 },
                { type: "ops"       as const, badge: "Operations · Stock below reorder",   message: "3 products are below reorder level. Restocking now prevents last-minute cancellations and lost revenue.",                                                        action: "View stock",      delay: 0.3 },
              ].map((item, i) => (
                <InsightCard key={i} type={item.type} badge={item.badge} message={item.message} action={item.action} delay={item.delay} />
              ))}
            </div>
          </div>
        </section>

        {/* ═════ FEATURES ═════ */}
        <section style={{ background: C.s1, padding: isMobile ? "64px 0" : "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40, padding: isMobile ? "0 24px" : 0 }}>
              <Eyebrow text="Everything you need" />
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                One platform.<br /><span style={{ color: C.gold }}>Every tool.</span>
              </h2>
              <p style={{ fontSize: 16, color: C.muted, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
                From Intelligent insights to payments, everything your business needs, is built in.
              </p>
            </div>

            {/* Tab bar – desktop */}
            {!isMobile && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32, justifyContent: "center" }}>
                {features.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => handleFeatureClick(i)}
                    style={{
                      background: activeFeature === i ? C.gold : "transparent",
                      color: activeFeature === i ? "#080808" : C.muted,
                      border: `1px solid ${activeFeature === i ? C.gold : C.border}`,
                      borderRadius: 100,
                      padding: "8px 18px",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: FONT_BODY,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}

            {/* Panel – desktop */}
            {!isMobile && (
              <div style={{ background: C.s2, border: `1px solid ${C.border2}`, borderRadius: 24, padding: 36, minHeight: 320 }}>
                {featurePanels[activeFeature]}
              </div>
            )}

            {/* Carousel – mobile */}
            {isMobile && (
              <>
                <div ref={carouselRef} className="feat-carousel">
                  {featurePanels.map((panel, i) => (
                    <div key={i} className="feat-carousel-card">
                      {panel}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
                  {features.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => handleFeatureClick(i)}
                      style={{ width: i === activeFeature ? 18 : 6, height: 6, borderRadius: 3, background: i === activeFeature ? C.gold : C.border, transition: "all 0.3s ease", cursor: "pointer" }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ═════ HEATMAP ═════ */}
        <section style={{ background: C.bg, padding: isMobile ? "64px 24px" : "96px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <Eyebrow text="Booking Heatmap" />
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                See where your<br /><span style={{ color: C.gold }}>demand actually lives.</span>
              </h2>
              <p style={{ fontSize: 16, color: C.muted, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
                The heatmap shows you which days and times fill fastest. So you can price, promote, and schedule smarter.
              </p>
            </div>

            <div style={{ background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 20, padding: isMobile ? "20px 16px" : 32, overflowX: "auto" }}>
              <div style={{ minWidth: 320 }}>
                <div style={{ display: "grid", gridTemplateColumns: "48px repeat(5,1fr)", gap: 6, marginBottom: 8 }}>
                  <div />
                  {["9am","11am","1pm","3pm","5pm"].map((t, i) => (
                    <div key={i} style={{ fontSize: 10, color: C.faint, textAlign: "center", letterSpacing: "0.06em" }}>{t}</div>
                  ))}
                </div>
                {heatRows.map((row, ri) => (
                  <div key={ri} style={{ display: "grid", gridTemplateColumns: "48px repeat(5,1fr)", gap: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", fontWeight: 600 }}>{row.day}</div>
                    {row.slots.map((v, ci) => (
                      <div
                        key={ci}
                        style={{
                          height: isMobile ? 28 : 36,
                          borderRadius: 6,
                          background: heatColor(v),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: v >= 8 ? "rgba(212,165,116,0.9)" : C.faint,
                          fontWeight: v >= 12 ? 700 : 400,
                        }}
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: C.faint }}>Bookings per slot:</span>
                  {[
                    { color: "rgba(255,255,255,0.04)", label: "0–3" },
                    { color: "rgba(212,165,116,0.18)", label: "4–7" },
                    { color: "rgba(212,165,116,0.42)", label: "8–11" },
                    { color: "rgba(212,165,116,0.72)", label: "12+" },
                  ].map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, border: `1px solid ${C.border}` }} />
                      <span style={{ fontSize: 10, color: C.faint }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════ COMPARISON ═════ */}
        <section style={{ background: C.s1, padding: isMobile ? "64px 24px" : "96px 24px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <Eyebrow text="How we compare" />
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 16 }}>
                Other tools show data.<br /><span style={{ color: C.gold }}>NextSlot drives action.</span>
              </h2>
            </div>

            <div style={{ background: C.s2, border: `1px solid ${C.border2}`, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", background: C.s3, padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: "0.1em", textTransform: "uppercase" }}>Feature</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center" }}>Others</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center" }}>NextSlot</span>
              </div>
              {compRows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 100px",
                    padding: "13px 20px",
                    borderBottom: i < compRows.length - 1 ? `1px solid ${C.border}` : "none",
                    background: row.usOnly ? "rgba(212,165,116,0.02)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: 13, color: C.muted }}>{row.feature}</span>
                  <span style={{ fontSize: 13, color: C.faint, textAlign: "center" }}>{row.them}</span>
                  <span style={{ fontSize: 13, fontWeight: row.usOnly ? 600 : 400, color: row.usOnly ? C.em : C.muted, textAlign: "center" }}>{row.us}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════ CTA ═════ */}
        <section style={{ background: C.bg, padding: isMobile ? "80px 24px" : "120px 24px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
            <Eyebrow text="Get started today" />
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? "clamp(28px,8vw,42px)" : "clamp(32px,4vw,52px)", fontWeight: 700, color: C.text, lineHeight: 1.08, marginBottom: 20 }}>
              Your dashboard should be<br /><span style={{ color: C.gold, fontStyle: "italic" }}>working for you.</span>
            </h2>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75, marginBottom: 40, maxWidth: 500, margin: "0 auto 40px" }}>
              Join beauty professionals across South Africa who use NextSlot to grow smarter, book more, and stress less.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link
                to="/onboarding"
                style={{ background: C.gold, color: "#080808", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, padding: "16px 36px", borderRadius: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, minHeight: 52, boxShadow: "0 8px 32px rgba(212,165,116,0.3)" }}
              >
                Start your free trial
              </Link>
            </div>
            <p style={{ marginTop: 20, fontSize: 12, color: C.faint, letterSpacing: "0.04em" }}>
              No credit card required · 30-day free trial · Cancel anytime
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
