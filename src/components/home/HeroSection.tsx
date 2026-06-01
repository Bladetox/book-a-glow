import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Orb } from "./Orb";
import { FloatCard, FloatCardData } from "./FloatCard";

const CTA_BG     = "radial-gradient(circle at 30% 26%, rgba(255,242,185,0.92) 0%, transparent 36%), radial-gradient(circle at 50% 50%, #D4A574 0%, #B8915F 48%, #7a4200 100%)";
const CTA_SHADOW = "inset -3px -5px 12px rgba(0,0,0,0.6), inset 3px 3px 8px rgba(255,235,160,0.22), 0 8px 32px rgba(184,145,95,0.7), 0 2px 10px rgba(0,0,0,0.65)";

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
        { id: 0, x: 8,           y: 20,  z: 2, vx:  0.14, vy:  0.10, label: "Revenue today",     value: "R 1,950", sub: "7 bookings · 4 remaining",  color: C.gold,  width: 120 },
        { id: 1, x: cw - 128,    y: 14,  z: 2, vx: -0.11, vy:  0.13, label: "Month progress",    value: "82%",     sub: "R 4,160 to beat last month", color: C.em,    width: 120 },
        { id: 2, x: 10,          y: 230, z: 2, vx:  0.10, vy: -0.14, label: "Cancellation rate", value: "22%",     sub: "Introduce a 30% deposit",   color: C.red,   width: 118 },
        { id: 3, x: cw - 126,    y: 224, z: 2, vx: -0.12, vy: -0.11, label: "Open slots",        value: "14",      sub: "Filling 6 adds R 3,480",    color: C.blue,  width: 118 },
        { id: 4, x: cw / 2 - 60, y: 320, z: 2, vx:  0.08, vy:  0.12, label: "Retention",         value: "38%",     sub: "Enrol 12 → hit 40%",        color: C.amber, width: 120 },
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
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: C.bg,
      }}
    >
      {/* Background image */}
      <div style={{
        position:           "absolute",
        inset:              0,
        backgroundImage:    "url('https://iili.io/C3gfi2S.jpg')",
        backgroundSize:     "cover",
        backgroundPosition: "center",
        backgroundRepeat:   "no-repeat",
        opacity:            0.22,
        filter:             "blur(1px) saturate(0.5)",
        transform:          "scale(1.04)",
        zIndex:             0,
        pointerEvents:      "none",
      }} />

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(212,165,116,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,165,116,0.03) 1px,transparent 1px)`,
        backgroundSize: "44px 44px",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
      } as React.CSSProperties} />

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
        gap: isMobile ? 32 : 64,
        alignItems: "center",
        width: "100%", maxWidth: 1120, margin: "0 auto",
        padding: isMobile ? "100px 24px 48px" : "100px 40px 48px",
      }}>
        {/* Copy */}
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(212,165,116,0.08)",
            border: "1px solid rgba(212,165,116,0.2)",
            borderRadius: 100, padding: "5px 14px",
            fontSize: 11, fontWeight: 600, color: C.gold,
            letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: 28, animation: "fadeUp 0.6s ease both",
            fontFamily: FONT_BODY,
          } as React.CSSProperties}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block", animation: "pulseDot 2s ease-in-out infinite" }} />
            AI-Powered · For Beauty Pros
          </div>

          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? "clamp(32px,8vw,46px)" : "clamp(36px,4.2vw,58px)",
            fontWeight: 700, color: C.text,
            marginBottom: 22,
            animation: "fadeUp 0.6s 0.1s ease both",
            lineHeight: 1.08,
          } as React.CSSProperties}>
            Your dashboard<br />
            should be <span style={{ color: C.gold, fontStyle: "italic" }}>speaking.</span>
          </h1>

          <p style={{
            fontSize: isMobile ? 14 : "clamp(14px,1.3vw,16px)",
            fontWeight: 300, color: C.muted,
            lineHeight: 1.75, marginBottom: 36,
            maxWidth: 460,
            animation: "fadeUp 0.6s 0.2s ease both",
            fontFamily: FONT_BODY,
          } as React.CSSProperties}>
            Most platforms show you what&apos;s happened. NextSlot tells you what&apos;s happening.
            With proactive insights, real-time revenue intelligence, and alerts that surface
            opportunities before they&apos;re missed, you&apos;ll always know where to focus next.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", animation: "fadeUp 0.6s 0.3s ease both" } as React.CSSProperties}>
            <Link
              to="/onboarding"
              style={{
                background: CTA_BG,
                boxShadow: CTA_SHADOW,
                color: "#080808",
                fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
                padding: "14px 30px", borderRadius: 10,
                textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 8,
                minHeight: 48,
              }}
            >
              Start for free
            </Link>
            <a
              href="#nexty-section"
              style={{
                fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: C.muted,
                textDecoration: "none", padding: "14px 4px",
                minHeight: 48, display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              See how it works ↗
            </a>
          </div>

          <p style={{
            marginTop: 22, fontSize: 11, color: C.faint,
            letterSpacing: "0.04em", fontWeight: 500,
            animation: "fadeUp 0.6s 0.4s ease both",
            fontFamily: FONT_BODY,
          } as React.CSSProperties}>
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
  );
};
