import React from "react";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

const GROUPS = [
  {
    number: "01",
    stage: "Capture",
    title: "Record the work as it happens.",
    description: "Bookings, payments, clients and daily operations.",
  },
  {
    number: "02",
    stage: "Understand",
    title: "See the business behind the activity.",
    description: "Your booking activity becomes a clearer picture of revenue, demand and client behaviour.",
  },
  {
    number: "03",
    stage: "Grow",
    title: "Focus on what matters to you.",
    description: "NextSlot surfaces the patterns and opportunities. You decide on the next steps.",
  },
];

export const FeaturesSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section
      style={{
        position: "relative",
        background: C.s1,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? "64px 16px" : "80px 40px",
        overflow: "hidden",
      }}
    >
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('https://iili.io/CF6Dsa4.jpg')",
        backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
        opacity: 0.35, filter: "blur(0.5px) saturate(0.7)", transform: "scale(1.04)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{
          textAlign: "center",
          marginBottom: isMobile ? 36 : 48,
          padding: isMobile ? "0 8px" : 0,
        }}>
          <Eyebrow text="How NextSlot works" />
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontSize: isMobile ? 30 : 44, fontWeight: 800,
            lineHeight: 1.1, color: C.text, margin: "0 0 14px", letterSpacing: "-0.02em",
          }}>
            From every booking to a <span style={{ color: C.gold }}>clearer business.</span>
          </h2>
          <p style={{
            fontSize: 15, color: C.muted, lineHeight: 1.65, maxWidth: 560, margin: "0 auto",
          }}>
            Record what happens. Understand what it means. Focus on where you can grow.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: isMobile ? 16 : 20,
          alignItems: "start",
        }}>
          {GROUPS.map((group) => (
            <article key={group.stage} style={{
              background: "rgba(12,12,12,0.84)",
              border: `1px solid ${C.border2}`,
              borderRadius: 18,
              padding: isMobile ? "22px 20px" : "26px 24px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.24)",
              fontFamily: FONT_BODY,
              minWidth: 0,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.12em" }}>
                  {group.number}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {group.stage}
                </span>
              </div>

              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: isMobile ? 22 : 24, fontWeight: 700,
                lineHeight: 1.18, color: C.text, margin: "0 0 10px", letterSpacing: "-0.015em",
              }}>
                <span style={{ color: C.gold }}>{group.title.split(" ")[0]}</span>{" "}{group.title.split(" ").slice(1).join(" ")}
              </h3>

              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 20px" }}>
                {group.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
