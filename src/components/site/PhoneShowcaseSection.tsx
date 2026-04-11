import { useEffect, useRef, useState } from "react";
import { MobileFrame } from "./DeviceFrames";
import MobileDashboardPreview from "./MobileDashboardPreview";

/* ─── CSS ────────────────────────────────────────────────────────────
   Rules:
   • ns-pan-out and ns-float live on SEPARATE wrappers — never
     combine two transform-animating keyframes on the same element.
   • will-change: transform is set inline so the browser compositor
     promotes the layer before the animation starts (no jank).
   • scale start kept at 1.9 (not 2.4) — enough drama, avoids
     large-scale repaint cost on low-end devices.
──────────────────────────────────────────────────────────── */
const STYLE = `
@keyframes ns-phone-enter {
  0%   { opacity: 0; transform: translateY(40px); }
  100% { opacity: 1; transform: translateY(0);    }
}
@keyframes ns-pan-out {
  0%   { transform: scale(1.9); }
  100% { transform: scale(1);   }
}
@keyframes ns-float {
  0%, 100% { transform: translateY(0px);   }
  50%       { transform: translateY(-8px);  }
}
@keyframes ns-glow-pulse {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.55; }
}
@keyframes ns-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ns-slide-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0);    }
}
`;

/* ─── Badge data ──────────────────────────────────────────────── */
const badges = [
  { label: "TikTok",    value: "42%", color: "hsl(var(--accent))",       delay: "3.6s", top: "8%",  right: "2%"  },
  { label: "Instagram", value: "28%", color: "#e1306c",                   delay: "4.1s", top: "26%", right: "-4%" },
  { label: "Referral",  value: "18%", color: "hsl(var(--accent)/0.7)",   delay: "4.6s", top: "46%", right: "0%"  },
  { label: "Google",    value: "12%", color: "#4285f4",                   delay: "5.1s", top: "20%", left: "-4%"  },
];

/* ─── Component ──────────────────────────────────────────────── */
const PhoneShowcaseSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); io.unobserve(el); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <style>{STYLE}</style>
      <div
        ref={ref}
        className="relative w-full flex flex-col items-center justify-center py-8 select-none"
        style={{ minHeight: 500 }}
      >
        {/* Ambient glow — compositor layer, no layout impact */}
        <div aria-hidden="true"
          className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div style={{
            width: 320, height: 320, borderRadius: "50%",
            background: "radial-gradient(circle, hsl(var(--accent)/0.15) 0%, transparent 70%)",
            willChange: "opacity",
            animation: vis ? "ns-glow-pulse 3.5s ease-in-out infinite" : "none",
          }} />
        </div>

        {/*
          LAYER STACK (outer → inner):
          1. ns-phone-enter  — outer wrapper: slide-up entry (translateY only)
          2. ns-float        — middle wrapper: perpetual float (translateY only)
          3. ns-pan-out      — inner wrapper: scale zoom-out (scale only)
          Keeping each animation on its OWN element eliminates
          transform-composition jank entirely.
        */}

        {/* 1. Entry wrapper */}
        <div
          className="relative"
          style={{
            width: 190,
            willChange: "transform, opacity",
            animation: vis
              ? "ns-phone-enter 0.85s cubic-bezier(0.22,1,0.36,1) both"
              : "none",
          }}
        >
          {/* 2. Float wrapper */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              willChange: "transform",
              animation: vis
                ? "ns-float 4s ease-in-out 4s infinite"
                : "none",
            }}
          >
            {/* 3. Pan-out wrapper — scale ONLY, no other transforms */}
            <div
              style={{
                willChange: "transform",
                transformOrigin: "center 28%",
                animation: vis
                  ? "ns-pan-out 2.6s cubic-bezier(0.16,1,0.3,1) 0.7s both"
                  : "none",
              }}
            >
              {/* pointer-events:none prevents MobileDashboardPreview
                  state updates from triggering re-renders mid-animation */}
              <div style={{ pointerEvents: "none" }}>
                <MobileFrame interactive={false}>
                  <MobileDashboardPreview />
                </MobileFrame>
              </div>
            </div>
          </div>

          {/* Stat badges — absolutely positioned relative to entry wrapper */}
          {badges.map((b) => (
            <div
              key={b.label}
              style={{
                position: "absolute",
                top: b.top,
                right: b.right ?? undefined,
                left: b.left ?? undefined,
                willChange: "transform, opacity",
                animation: vis
                  ? `ns-slide-up 0.45s cubic-bezier(0.22,1,0.36,1) ${b.delay} both`
                  : "none",
                zIndex: 10,
              }}
            >
              <div style={{
                background: "hsl(var(--background))",
                border: `1px solid ${b.color}38`,
                borderRadius: 10,
                padding: "5px 10px",
                boxShadow: `0 4px 14px -4px ${b.color}38`,
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 88,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: b.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 9, color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>
                  {b.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--foreground))", marginLeft: "auto" }}>
                  {b.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Caption */}
        <div
          style={{
            marginTop: 68,
            textAlign: "center",
            animation: vis ? "ns-fade-in 0.6s ease 4.2s both" : "none",
          }}
        >
          <p style={{
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}>
            Client source breakdown · live in your dashboard
          </p>
          <p style={{
            fontSize: 12,
            color: "hsl(var(--muted-foreground)/0.7)",
            maxWidth: 300,
            margin: "0 auto",
            lineHeight: 1.6,
          }}>
            Toggle on or off the data you want to see. Your dashboard shows exactly what matters to your business, nothing more.
          </p>
        </div>
      </div>
    </>
  );
};

export default PhoneShowcaseSection;
