import { useEffect, useRef, useState } from "react";
import { MobileFrame } from "./DeviceFrames";
import MobileDashboardPreview from "./MobileDashboardPreview";

/* ─── CSS keyframes injected once ─────────────────────────────── */
const STYLE = `
@keyframes ns-phone-enter {
  0%   { opacity: 0; transform: translateY(48px) scale(0.92); }
  100% { opacity: 1; transform: translateY(0px)  scale(1);    }
}
@keyframes ns-pan-out {
  0%   { transform: scale(2.4); }
  100% { transform: scale(1);   }
}
@keyframes ns-float {
  0%, 100% { transform: translateY(0px);  }
  50%       { transform: translateY(-10px); }
}
@keyframes ns-glow-pulse {
  0%, 100% { opacity: 0.35; }
  50%       { opacity: 0.6;  }
}
@keyframes ns-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ns-slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes ns-hand-enter {
  0%   { opacity: 0; transform: translateY(60px); }
  100% { opacity: 1; transform: translateY(0);    }
}
`;

/* ─── Professional hand / person SVG ──────────────────────────── */
const HandSVG = () => (
  <svg
    viewBox="0 0 160 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
    aria-hidden="true"
  >
    {/* Arm */}
    <path
      d="M55 220 Q50 170 60 140 Q65 120 75 110 L85 108 Q95 118 100 140 Q110 170 105 220Z"
      fill="hsl(var(--foreground)/0.08)"
    />
    {/* Palm */}
    <ellipse cx="80" cy="115" rx="26" ry="20" fill="hsl(var(--foreground)/0.12)" />
    {/* Fingers holding phone */}
    <rect x="56" y="72" width="12" height="50" rx="6" fill="hsl(var(--foreground)/0.10)" />
    <rect x="70" y="64" width="12" height="54" rx="6" fill="hsl(var(--foreground)/0.12)" />
    <rect x="84" y="64" width="12" height="54" rx="6" fill="hsl(var(--foreground)/0.12)" />
    <rect x="98" y="70" width="12" height="48" rx="6" fill="hsl(var(--foreground)/0.10)" />
    {/* Thumb */}
    <ellipse cx="52" cy="98" rx="8" ry="14" fill="hsl(var(--foreground)/0.10)" transform="rotate(-20 52 98)" />
    {/* Knuckle highlights */}
    <ellipse cx="62" cy="75" rx="4" ry="2" fill="hsl(var(--foreground)/0.06)" />
    <ellipse cx="76" cy="67" rx="4" ry="2" fill="hsl(var(--foreground)/0.06)" />
    <ellipse cx="90" cy="67" rx="4" ry="2" fill="hsl(var(--foreground)/0.06)" />
    <ellipse cx="104" cy="73" rx="4" ry="2" fill="hsl(var(--foreground)/0.06)" />
  </svg>
);

/* ─── Stat badge floaters ──────────────────────────────────────── */
const badges = [
  { label: "TikTok",    value: "42%",  color: "hsl(var(--accent))",      delay: "3.8s", top: "8%",  right: "4%"  },
  { label: "Instagram", value: "28%",  color: "#e1306c",                  delay: "4.4s", top: "26%", right: "-2%" },
  { label: "Referral",  value: "18%",  color: "hsl(var(--accent)/0.75)", delay: "5s",   top: "46%", right: "2%"  },
  { label: "Google",    value: "12%",  color: "#4285f4",                  delay: "5.6s", top: "20%", left: "-2%"  },
];

/* ─── Main component ───────────────────────────────────────────── */
const PhoneShowcaseSection = () => {
  const ref     = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); io.unobserve(el); } },
      { threshold: 0.2 }
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
        style={{ minHeight: 480 }}
      >
        {/* Ambient glow behind phone */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
          <div
            style={{
              width: 340,
              height: 340,
              borderRadius: "50%",
              background: "radial-gradient(circle, hsl(var(--accent)/0.18) 0%, transparent 70%)",
              animation: vis ? "ns-glow-pulse 3s ease-in-out infinite" : "none",
            }}
          />
        </div>

        {/* ── Phone + hand wrapper ── */}
        <div
          className="relative"
          style={{
            width: 190,
            animation: vis ? "ns-phone-enter 0.9s cubic-bezier(0.22,1,0.36,1) both" : "none",
          }}
        >
          {/* Hand beneath phone */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: "-48px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 130,
              height: 130,
              animation: vis ? "ns-hand-enter 1.1s cubic-bezier(0.22,1,0.36,1) 0.3s both" : "none",
              zIndex: 0,
            }}
          >
            <HandSVG />
          </div>

          {/* Pan-out wrapper — zooms from close-up to full phone */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              animation: vis
                ? "ns-pan-out 2.8s cubic-bezier(0.22,1,0.36,1) 0.8s both, ns-float 4s ease-in-out 4s infinite"
                : "none",
              transformOrigin: "center 30%",
            }}
          >
            <MobileFrame interactive={false}>
              <MobileDashboardPreview />
            </MobileFrame>
          </div>

          {/* Stat badge floaters — appear after pan-out completes */}
          {badges.map((b) => (
            <div
              key={b.label}
              style={{
                position: "absolute",
                top: b.top,
                right: b.right ?? undefined,
                left: b.left ?? undefined,
                animation: vis ? `ns-slide-up 0.5s cubic-bezier(0.22,1,0.36,1) ${b.delay} both` : "none",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  background: "hsl(var(--background))",
                  border: `1px solid ${b.color}40`,
                  borderRadius: 10,
                  padding: "5px 10px",
                  boxShadow: `0 4px 16px -4px ${b.color}40`,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 90,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: b.color,
                    flexShrink: 0,
                  }}
                />
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

        {/* Caption beneath */}
        <p
          style={{
            marginTop: 64,
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            animation: vis ? "ns-fade-in 0.6s ease 4s both" : "none",
          }}
        >
          Client source breakdown · live in your dashboard
        </p>
      </div>
    </>
  );
};

export default PhoneShowcaseSection;
