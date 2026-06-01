import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Orb } from "./Orb";
import { FloatCard, FloatCardData } from "./FloatCard";
import { Eyebrow } from "./Eyebrow";

export const HeroSection = () => {
  const width      = useWindowWidth();
  const isMobile   = width < BP;
  const orbScale   = isMobile ? 0.55 : 1;
  const cardWorldW = isMobile ? Math.min(width - 48, 340) : 480;
  const cardWorldH = isMobile ? 380 : 480;

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);

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

  return (
    <section
      style={{
        position: "relative",
        minHeight: isMobile ? "auto" : "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: isMobile ? "80px 0 40px" : "0",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{
        position: "absolute", left: "50%", top: "40%",
        transform: "translate(-50%,-50%)",
        width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,165,116,0.07) 0%, transparent 65%)",
        animation: "heroBreathe 6s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: isMobile ? "0 24px" : "0 40px",
        width: "100%",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? 40 : 60,
        alignItems: "center",
      }}>
        {/* Left: copy */}
        <div style={{ animation: "fadeUp 0.7s ease 0.1s both" }}>
          <Eyebrow text="South Africa's booking intelligence platform" />
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 36 : 56,
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
            color: C.text,
            marginBottom: 20,
          }}>
            Your business,<br />
            <span style={{ color: C.gold }}>finally intelligent.</span>
          </h1>
          <p style={{
            fontSize: isMobile ? 15 : 17,
            color: C.muted,
            lineHeight: 1.7,
            maxWidth: 440,
            marginBottom: 36,
          }}>
            NextSlot gives South African service businesses a smart booking page, proactive AI insights,
            and a revenue dashboard built for the real world.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Link
              to="/onboarding"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: C.gold, color: "#080808",
                fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700,
                padding: "14px 28px", borderRadius: 10,
                textDecoration: "none",
                boxShadow: "0 8px 32px rgba(212,165,116,0.35)",
                letterSpacing: "0.01em",
              }}
            >
              Start free trial
            </Link>
            <Link
              to="/demo"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: C.muted, fontSize: 13, fontWeight: 500,
                textDecoration: "none",
                border: `1px solid ${C.border2}`,
                padding: "13px 22px", borderRadius: 10,
              }}
            >
              View live demo
            </Link>
          </div>
          <p style={{ fontSize: 11, color: C.faint, marginTop: 14 }}>
            No credit card required · 30-day free trial · Cancel anytime
          </p>
        </div>

        {/* Right: orb + floating cards */}
        <div style={{
          position: "relative",
          width: cardWorldW,
          height: cardWorldH,
          margin: isMobile ? "0 auto" : "0",
          animation: "fadeUp 0.7s ease 0.3s both",
        }} ref={containerRef}>
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
