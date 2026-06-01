import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { SpeechBubble } from "./SpeechBubble";
import { Eyebrow } from "./Eyebrow";

export const NextyAISection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section
      id="nexty-section"
      style={{
        background: `linear-gradient(180deg,${C.bg} 0%,${C.s1} 50%,${C.bg} 100%)`,
        padding: isMobile ? "64px 24px" : "96px 24px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Eyebrow text="Nexty AI · Business Growth Advisor" />
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(28px,3.5vw,46px)",
            fontWeight: 700, color: C.text,
            lineHeight: 1.08, marginBottom: 16,
          }}>
            More personalised than<br /><span style={{ color: C.gold }}>most advisors.</span>
          </h2>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 580, margin: "0 auto", lineHeight: 1.7, fontFamily: FONT_BODY }}>
            Nexty is always learning your business: your peak times, your riskiest clients, your
            biggest opportunities. So when she speaks, it&apos;s not generic advice. It&apos;s yours.
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
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            height: isMobile ? 260 : 340,
            flexShrink: 0,
          }}>
            {/* Pulse glow */}
            <div style={{
              position: "absolute",
              width: isMobile ? 200 : 280, height: isMobile ? 200 : 280,
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(212,165,116,0.12) 0%,transparent 65%)",
              animation: "orbBgPulse 3.5s ease-in-out infinite",
            }} />
            {/* Outer spinning ring */}
            <div style={{
              position: "absolute",
              width: isMobile ? 140 : 200, height: isMobile ? 140 : 200,
              borderRadius: "50%",
              border: "1.5px solid transparent",
              borderTopColor: "rgba(212,165,116,0.9)",
              borderRightColor: "rgba(212,165,116,0.3)",
              borderBottomColor: "rgba(212,165,116,0.05)",
              borderLeftColor: "rgba(212,165,116,0.3)",
              animation: "nextyOrbit 2.4s linear infinite",
              filter: "drop-shadow(0 0 6px rgba(212,165,116,0.5))",
            }} />
            {/* Inner counter-spinning ring */}
            <div style={{
              position: "absolute",
              width: isMobile ? 110 : 160, height: isMobile ? 110 : 160,
              borderRadius: "50%",
              border: "1px solid rgba(212,165,116,0.15)",
              borderTopColor: "rgba(212,165,116,0.5)",
              animation: "nextyOrbitR 3.8s linear infinite",
            }} />
            {/* Core orb */}
            <div style={{
              position: "relative",
              width: isMobile ? 70 : 100, height: isMobile ? 70 : 100,
              borderRadius: "50%",
              background: "radial-gradient(circle at 32% 28%,rgba(255,240,180,0.85) 0%,transparent 40%),radial-gradient(circle at 50% 50%,#D4A574 0%,#B8915F 45%,#8a5b00 100%)",
              boxShadow: "inset -3px -4px 10px rgba(0,0,0,0.5),0 8px 32px rgba(184,145,95,0.55)",
              animation: "orbBreathe 4s ease-in-out infinite",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 8 : 11, color: "rgba(8,8,8,0.75)", letterSpacing: "0.04em" }}>nexty</span>
            </div>
            {/* Orbiting dots */}
            <div style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: C.gold, boxShadow: "0 0 10px rgba(212,165,116,0.8)", animation: "nextyDot1 2.4s linear infinite" }} />
            <div style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: C.gold, boxShadow: "0 0 10px rgba(212,165,116,0.8)", animation: "nextyDot2 3.8s linear infinite" }} />
          </div>

          {/* Speech bubbles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              fontSize: 11, color: C.faint,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: FONT_BODY, marginBottom: 4,
            }}>
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
  );
};
