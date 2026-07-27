import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Orb } from "./Orb";
import { FloatCard, FloatCardData } from "./FloatCard";
import heroImage from "../../assets/NexSlot_Hero.png";

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
      {/* ── Background image ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
        backgroundRepeat: "no-repeat",
      }} />

      {/* ── Directional overlay: heavier left (copy), lighter right (cards) ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: isMobile
          ? "rgba(8,8,8,0.72)"
          : "linear-gradient(to right, rgba(8,8,8,0.82) 0%, rgba(8,8,8,0.72) 50%, rgba(8,8,8,0.52) 100%)",
      }} />

      {/* ── Content ── */}
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

          {/* 1. LABEL — plain, no pulse dot */}
          <p style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.muted,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: FONT_BODY,
            marginBottom: 28,
            animation: "fadeUp 0.5s ease both",
          } as React.CSSProperties}>
            For solo service businesses
          </p>

          {/* 2. HEADLINE — aspirational, identity-first */}
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? "clamp(30px,8vw,44px)" : "clamp(34px,3.8vw,52px)",
            fontWeight: 700,
            color: C.text,
            lineHeight: 1.1,
            marginBottom: 20,
            animation: "fadeUp 0.5s 0.08s ease both",
          } as React.CSSProperties}>
            You've outgrown your side hustle.<br />
            <span style={{ color: C.gold }}>Finally</span>, a system that reflects<br />
            your ambition.
          </h1>

          {/* 3. DIFFERENTIATOR — owned, competitor-aware */}
          <p style={{
            fontSize: isMobile ? 15 : "clamp(15px,1.3vw,17px)",
            color: C.muted,
            lineHeight: 1.65,
            marginBottom: 40,
            maxWidth: 440,
            fontFamily: FONT_BODY,
            fontWeight: 400,
            animation: "fadeUp 0.5s 0.16s ease both",
          } as React.CSSProperties}>
            Most booking apps just fill your diary.
            Nextslot shows you why it's not full enough
            — and exactly what to do about it.
          </p>

          {/* 4. TESTIMONIAL — real name, no icon avatar */}
          <div style={{
            marginBottom: 40,
            padding: "14px 16px",
            borderLeft: `3px solid ${C.gold}`,
            background: "rgba(212,165,116,0.06)",
            borderRadius: "0 8px 8px 0",
            animation: "fadeUp 0.5s 0.24s ease both",
          } as React.CSSProperties}>
            <p style={{
              fontSize: 13,
              color: C.text,
              fontFamily: FONT_BODY,
              lineHeight: 1.6,
              fontWeight: 400,
              margin: 0,
              marginBottom: 6,
            }}>
              "In 3 months my bookings doubled and I stopped losing clients to no-shows."
            </p>
            <p style={{
              fontSize: 11,
              color: C.muted,
              fontFamily: FONT_BODY,
              margin: 0,
              fontWeight: 500,
            }}>
              Shu-meez — PhenomeBeauty, Cape Town
            </p>
          </div>

          {/* 5. CTA — solid gold, no gradient, low-stakes framing */}
          <div style={{
            animation: "fadeUp 0.5s 0.32s ease both",
            display: "flex",
            flexDirection: "column",
            alignItems: isMobile ? "stretch" : "flex-start",
          } as React.CSSProperties}>
            <Link
              to="/pricing"
              style={{
                background: C.gold,
                color: "#080808",
                fontFamily: FONT_BODY,
                fontSize: 15,
                fontWeight: 700,
                padding: "15px 32px",
                borderRadius: 8,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 52,
                letterSpacing: "0.01em",
              }}
            >
              Start for free
            </Link>
            <p style={{
              marginTop: 10,
              fontSize: 11,
              color: C.faint,
              fontFamily: FONT_BODY,
              fontWeight: 400,
              textAlign: isMobile ? "center" : "left",
            } as React.CSSProperties}>
              No card needed · Live in under 10 minutes
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
