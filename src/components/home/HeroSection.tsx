import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, FONT_DISPLAY, FONT_BODY, BP } from "./tokens";
import useWindowWidth from "./useWindowWidth";
import Orb from "./Orb";
import FloatCard, { FloatCardData } from "./FloatCard";

/* ─── HeroSection ─────────────────────────────────────────── */
const HeroSection = () => {
  const width      = useWindowWidth();
  const isMobile   = width < BP;
  const orbScale   = isMobile ? 0.55 : 1;
  const cardWorldW = isMobile ? Math.min(width - 48, 340) : 480;
  const cardWorldH = isMobile ? 380 : 480;

  const containerRef  = useRef<HTMLDivElement>(null);
  const rafRef        = useRef<number>(0);
  const prevMobileRef = useRef(false);

  /* ── Card factory ── */
  const makeCards = useCallback((mobile: boolean, cw: number): FloatCardData[] => {
    if (mobile) {
      return [
        { id: 0, x: 8,          y: 20,  z: 2, vx:  0.14, vy:  0.10, label: "Revenue today",     value: "R 1,950", sub: "7 bookings · 4 remaining",  color: C.gold,  width: 120 },
        { id: 1, x: cw - 128,   y: 14,  z: 2, vx: -0.11, vy:  0.13, label: "Month progress",    value: "82%",     sub: "R 4,160 to beat last month", color: C.em,    width: 120 },
        { id: 2, x: 10,         y: 230, z: 2, vx:  0.10, vy: -0.14, label: "Cancellation rate", value: "22%",     sub: "Introduce a 30% deposit",   color: C.red,   width: 118 },
        { id: 3, x: cw - 126,   y: 224, z: 2, vx: -0.12, vy: -0.11, label: "Open slots",        value: "14",      sub: "Filling 6 adds R 3,480",    color: C.blue,  width: 118 },
        { id: 4, x: cw / 2 - 60,y: 320, z: 2, vx:  0.08, vy:  0.12, label: "Retention",         value: "38%",     sub: "Enrol 12 → hit 40%",        color: C.amber, width: 120 },
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

  /* ── Rebuild cards on breakpoint cross ── */
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

  return (
    <section style={{
      position:   "relative",
      minHeight:  isMobile ? "auto" : "100vh",
      display:    "flex",
      alignItems: "center",
      overflow:   "hidden",
      background: C.bg,
    }}>

      {/* Background glow */}
      <div style={{
        position:   "absolute",
        left:       "50%",
        top:        "50%",
        transform:  "translate(-50%,-50%)",
        width:      isMobile ? 400 : 700,
        height:     isMobile ? 400 : 700,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,165,116,0.055) 0%, transparent 65%)",
        animation:  "heroBreathe 6s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 1200,
        margin:   "0 auto",
        padding:  isMobile ? "80px 24px 60px" : "120px 48px",
        display:  "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap:      isMobile ? 48 : 80,
        alignItems: "center",
        width:    "100%",
      }}>

        {/* ── Left: copy ── */}
        <div style={{ animation: "fadeUp 0.7s ease both" }}>
          {/* Eyebrow */}
          <div style={{
            display:       "inline-flex",
            alignItems:    "center",
            gap:           8,
            background:    "rgba(212,165,116,0.08)",
            border:        "1px solid rgba(212,165,116,0.2)",
            borderRadius:  100,
            padding:       "5px 14px",
            fontSize:      11,
            fontWeight:    600,
            color:         C.gold,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom:  28,
          } as React.CSSProperties}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: C.gold,
              animation:  "pulseDot 1.8s ease-in-out infinite",
              display:    "inline-block",
            }} />
            Booking + Business Intelligence
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily:  FONT_DISPLAY,
            fontSize:    isMobile ? 36 : 58,
            fontWeight:  800,
            lineHeight:  1.04,
            letterSpacing: "-0.02em",
            color:       C.text,
            marginBottom: 24,
          }}>
            Your bookings.
            <br />
            <span style={{ color: C.gold }}>Your data.</span>
            <br />
            <span style={{ color: C.muted, fontWeight: 600, fontSize: isMobile ? 28 : 44 }}>
              Your edge.
            </span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize:    isMobile ? 15 : 17,
            color:       C.muted,
            lineHeight:  1.7,
            marginBottom: 36,
            maxWidth:    460,
            fontFamily:  FONT_BODY,
          }}>
            NextSlot is the booking and business intelligence platform built for South African service businesses.
            Not just a calendar. A system that helps you grow.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link
              to="/onboarding"
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            8,
                background:     C.gold,
                color:          "#080808",
                fontFamily:     FONT_DISPLAY,
                fontSize:       14,
                fontWeight:     700,
                padding:        "14px 28px",
                borderRadius:   12,
                textDecoration: "none",
                letterSpacing:  "0.01em",
                boxShadow:      `0 4px 24px rgba(212,165,116,0.35)`,
                transition:     "all 0.2s",
              }}
            >
              Start free — 30 days
              <span style={{ fontSize: 16 }}>→</span>
            </Link>
            <Link
              to="/demo"
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            8,
                background:     "transparent",
                color:          C.muted,
                fontFamily:     FONT_BODY,
                fontSize:       14,
                fontWeight:     500,
                padding:        "14px 24px",
                borderRadius:   12,
                textDecoration: "none",
                border:         `1px solid ${C.border2}`,
                transition:     "all 0.2s",
              }}
            >
              Live demo
            </Link>
          </div>

          {/* Trust row */}
          <div style={{
            display:    "flex",
            flexWrap:   "wrap",
            gap:        20,
            marginTop:  32,
            fontSize:   12,
            color:      C.faint,
            fontFamily: FONT_BODY,
          }}>
            {["No credit card", "Cancel anytime", "Built for SA"].map((t, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: C.em }}>&#10003;</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right: orb + float cards ── */}
        <div style={{
          position:   "relative",
          width:      cardWorldW,
          height:     cardWorldH,
          margin:     isMobile ? "0 auto" : undefined,
          flexShrink: 0,
          animation:  "fadeUp 0.9s ease 0.2s both",
        }}
          ref={containerRef}
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
  );
};

export default HeroSection;
