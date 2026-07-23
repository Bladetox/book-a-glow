import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Orb } from "./Orb";
import { FloatCard, FloatCardData } from "./FloatCard";

const CTA_BG     = "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW = "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

const HOW_IT_WORKS = [
  { icon: "✦", text: "Frictionless bookings and automated payments" },
  { icon: "✦", text: "While you focus on your clients, your dashboard spots the clients that aren't returning and why your slots are empty" },
];

export const HeroSection = () => {
  const width      = useWindowWidth();
  const isMobile   = width < BP;
  const orbScale   = isMobile ? 0.55 : 1;
  const cardWorldW = isMobile ? Math.min(width - 48, 340) : 480;
  const cardWorldH = isMobile ? 320 : 480;

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);

  const makeCards = useCallback((mobile: boolean, cw: number): FloatCardData[] => {
    if (mobile) {
      return [
        { id: 0, x: 8,           y: 20,  z: 2, vx:  0.07, vy:  0.05, label: "Revenue today",     value: "R 1,950", sub: "7 bookings · 4 remaining",  color: C.gold,  width: 120 },
        { id: 1, x: cw - 128,    y: 14,  z: 2, vx: -0.06, vy:  0.07, label: "Month progress",    value: "82%",     sub: "R 4,160 to beat last month", color: C.em,    width: 120 },
        { id: 2, x: 10,          y: 210, z: 2, vx:  0.05, vy: -0.07, label: "Cancellation rate", value: "22%",     sub: "Introduce a 30% deposit",   color: C.red,   width: 118 },
        { id: 3, x: cw - 126,    y: 204, z: 2, vx: -0.06, vy: -0.06, label: "Open slots",        value: "14",      sub: "Filling 6 adds R 3,480",    color: C.blue,  width: 118 },
        { id: 4, x: cw / 2 - 60, y: 250, z: 2, vx:  0.04, vy:  0.06, label: "Retention",         value: "38%",     sub: "Enrol 12 → hit 40%",        color: C.amber, width: 120 },
      ];
    }
    return [
      { id: 0, x: 18,  y: 40,  z: 2, vx:  0.09, vy:  0.06, label: "Revenue today",     value: "R 1,950",  sub: "7 bookings · 4 remaining",      color: C.gold,  width: 168 },
      { id: 1, x: 260, y: 20,  z: 2, vx: -0.07, vy:  0.08, label: "Month progress",    value: "82%",      sub: "R 4,160 to beat last month",     color: C.em,    width: 154 },
      { id: 2, x: 48,  y: 250, z: 2, vx:  0.06, vy: -0.09, label: "Cancellation rate", value: "22%",      sub: "Introduce a 30% deposit",        color: C.red,   width: 160 },
      { id: 3, x: 270, y: 230, z: 2, vx: -0.08, vy: -0.07, label: "Open slots · Thu",  value: "14",       sub: "Filling 6 adds R 3,480",         color: C.blue,  width: 156 },
      { id: 4, x: 140, y: 370, z: 2, vx:  0.05, vy:  0.08, label: "Retention",         value: "38%",      sub: "Enrol 12 regulars → hit 40%",    color: C.amber, width: 158 },
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
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: C.bg,
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", width: 640, height: 640, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(212,165,116,0.07) 0%,transparent 70%)",
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        animation: "heroBreathe 7s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 2,
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined : "1fr 1fr",
        gap: isMobile ? 0 : 64,
        alignItems: "center",
        width: "100%", maxWidth: 1120, margin: "0 auto",
        padding: isMobile ? "96px 24px 56px" : "100px 40px 48px",
      }}>

        {/* ── COPY COLUMN ── */}
        <div>

          {/* 1. WHO IS THIS FOR */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(212,165,116,0.08)",
            border: "1px solid rgba(212,165,116,0.2)",
            borderRadius: 100, padding: "5px 14px",
            fontSize: 11, fontWeight: 600, color: C.gold,
            letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: 24, animation: "fadeUp 0.6s ease both",
            fontFamily: FONT_BODY,
          } as React.CSSProperties}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block", animation: "pulseDot 2s ease-in-out infinite" }} />
            Intelligent · Built for Service Businesses
          </div>

          {/* H1 */}
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? "clamp(32px,8vw,46px)" : "clamp(36px,4.2vw,58px)",
            fontWeight: 700, color: C.text,
            marginBottom: 16,
            animation: "fadeUp 0.6s 0.1s ease both",
            lineHeight: 1.08,
          } as React.CSSProperties}>
            Your dashboard<br />
            should be <span style={{ color: C.gold, fontStyle: "italic" }}>speaking.</span>
          </h1>

          {/* 2. WHAT MAKES US DIFFERENT */}
          <p style={{
            fontSize: isMobile ? 15 : "clamp(15px,1.4vw,18px)",
            fontWeight: 500, color: C.text,
            lineHeight: 1.5, marginBottom: 32,
            maxWidth: 460,
            animation: "fadeUp 0.6s 0.2s ease both",
            fontFamily: FONT_BODY,
          } as React.CSSProperties}>
            The only booking platform that tells you what to do next, so your business can grow.
          </p>

          {/* 3. HOW IT WORKS — scannable list */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 14,
            marginBottom: 40,
            animation: "fadeUp 0.6s 0.25s ease both",
          } as React.CSSProperties}>
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  flexShrink: 0,
                  marginTop: 2,
                  fontSize: 10,
                  color: C.gold,
                  opacity: 0.7,
                  lineHeight: 1.6,
                }}>✦</span>
                <span style={{
                  fontSize: isMobile ? 13 : 14,
                  color: C.muted,
                  lineHeight: 1.65,
                  fontFamily: FONT_BODY,
                  fontWeight: 300,
                }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Standalone statement */}
          <p style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 500,
            color: C.text,
            lineHeight: 1.6,
            marginBottom: 32,
            fontFamily: FONT_BODY,
            animation: "fadeUp 0.6s 0.3s ease both",
            borderLeft: `2px solid rgba(212,165,116,0.4)`,
            paddingLeft: 14,
          } as React.CSSProperties}>
            NextSlot doesn't just manage your diary. It runs the intelligence layer most booking systems are missing.
          </p>
          
          {/* 4. TRUST — social proof BEFORE the ask */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            marginBottom: 40,
            padding: "16px 18px",
            background: "rgba(212,165,116,0.05)",
            border: "1px solid rgba(212,165,116,0.15)",
            borderRadius: 12,
            animation: "fadeUp 0.6s 0.35s ease both",
          } as React.CSSProperties}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(212,165,116,0.10)",
              border: "1.5px solid rgba(212,165,116,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 13, color: C.gold,
            }}>✦</div>
            <div>
              <p style={{
                fontSize: 13, color: C.text,
                fontFamily: FONT_BODY, lineHeight: 1.55,
                fontWeight: 500, margin: 0, marginBottom: 4,
              }}>
                "My dashboard showed me exactly what to focus on, in 3 months my bookings doubled."
              </p>
              <p style={{
                fontSize: 11, color: C.muted,
                fontFamily: FONT_BODY, margin: 0,
              }}> Shu-meez, PhenomeBeauty · Cape Town</p>
            </div>
          </div>

          {/* 5. PRICE-ANCHORED CTA — the ask, after trust is earned */}
          <div style={{ animation: "fadeUp 0.6s 0.45s ease both" } as React.CSSProperties}>
            <Link
              to="/pricing"
              style={{
                background: CTA_BG,
                boxShadow: CTA_SHADOW,
                color: "#080808",
                fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700,
                padding: "15px 32px", borderRadius: 10,
                textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 8,
                minHeight: 52, width: "auto",
                justifyContent: isMobile ? "center" : "flex-start",
              }}
            >
              Get clarity from R99
            </Link>
            <p style={{
              marginTop: 12, fontSize: 11,
              color: "rgba(232,232,230,0.38)",
              letterSpacing: "0.03em", fontWeight: 400,
              fontFamily: FONT_BODY,
              textAlign: isMobile ? "center" : "left",
            } as React.CSSProperties}>
              Free 7-day trial on Starter · Free 30-day trial Flow/ Professional· Live in under 10 minutes
            </p>
          </div>
        </div>

        {/* ── CARD WORLD (desktop: right column / mobile: below copy) ── */}
        <div
          ref={containerRef}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: isMobile ? cardWorldW : "100%",
            margin: isMobile ? "48px auto 0" : undefined,
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
  );
};
