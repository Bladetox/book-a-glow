import { useRef } from "react";
import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

/*
  Laws of UX applied
  ─────────────────────────────────────────────────────────────
  Serial Position Effect   : Before first, Result last — the outcome
                             is the most memorable item.
  Von Restorff Effect      : The Result card is gold-bordered and
                             visually distinct — it will be remembered.
  Aesthetic-Usability      : Clean card surfaces, consistent radius,
                             generous whitespace reduce perceived effort.
  Miller's Law             : Two steps only (Before / Shift)
                             — well within the 7+2 chunk limit.
  Goal-Gradient Effect     : Step numbers + visible progression cue
                             the reader toward the outcome.
  Zeigarnik Effect         : Step 01 is intentionally unresolved —
                             tension draws the eye to 02.
  Jakobs Law               : Timeline cards follow a familiar
                             before/after narrative pattern.
  Proximity                : Related copy, stat, and bullet tightly
                             grouped; inter-card gap is wider.
*/

const STEPS = [
  {
    step: "01",
    tag: "The before",
    headline: "Working hard at everything.",
    body: "Busy every day, but no clear picture of what was actually moving the business forward. Every service, every channel, every time slot felt equally important. None of them were.",
    stat: null,
    isFinal: false,
  },
  {
    step: "02",
    tag: "The shift",
    headline: "Clarity is a competitive advantage.",
    body: "The data was already there. NextSlot just made it readable. She stopped spreading herself thin, because now she knew where her attention was needed.",
    stat: "2x bookings. 3 months.",
    isFinal: true,
  },
] as const;

export const CaseStudySection = () => {
  const width    = useWindowWidth();
  const isMobile = width < BP;
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? "72px 0 80px" : "100px 40px 108px",
        overflow: "hidden",
      }}
    >
      {/* Gold ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,165,116,0.06) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1120,
          margin: "0 auto",
          padding: isMobile ? "0 24px" : "0",
        }}
      >
        {/* Section header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? 40 : 64,
          }}
        >
          <Eyebrow text="Real result. PhenomeBeauty." />
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: isMobile ? 30 : 44,
              fontWeight: 800,
              lineHeight: 1.08,
              color: C.text,
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}
          >
            She was not doing less.{" "}
            <span style={{ color: C.gold }}>She just did not know where to focus.</span>
          </h2>
          <p
            style={{
              fontSize: isMobile ? 14 : 16,
              color: C.muted,
              lineHeight: 1.75,
              maxWidth: 520,
              margin: "0 auto",
              fontFamily: FONT_BODY,
            }}
          >
            Shu-meez has been in the beauty industry for 17 years and has run PhenomeBeauty
            in Cape Town for 6 of them. NextSlot showed her exactly which services, time slots,
            and clients were driving growth. Within 3 months, her bookings doubled.
          </p>
        </div>

        {/* Two-step timeline */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: isMobile ? 16 : 24,
            maxWidth: 760,
            margin: "0 auto",
          }}
        >
          {STEPS.map((s) => (
            <div
              key={s.step}
              style={{
                position: "relative",
                background: s.isFinal ? "rgba(212,165,116,0.07)" : C.s2,
                border: s.isFinal
                  ? `1.5px solid rgba(212,165,116,0.55)`
                  : `1px solid ${C.border}`,
                borderRadius: 18,
                padding: isMobile ? "24px 22px" : "28px 26px",
                boxShadow: s.isFinal
                  ? "0 4px 32px rgba(212,165,116,0.12)"
                  : "none",
                overflow: "hidden",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: 14,
                  bottom: 10,
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: s.isFinal
                    ? "rgba(212,165,116,0.10)"
                    : "rgba(232,232,230,0.04)",
                  pointerEvents: "none",
                  userSelect: "none",
                  fontFamily: FONT_DISPLAY,
                }}
              >
                {s.step}
              </span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: s.isFinal ? C.gold : C.faint,
                    fontFamily: FONT_BODY,
                  }}
                >
                  {s.tag}
                </span>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: s.isFinal ? C.gold : C.s3,
                    color: s.isFinal ? "#080808" : C.muted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: FONT_BODY,
                    flexShrink: 0,
                  }}
                >
                  {parseInt(s.step)}
                </span>
              </div>

              <h3
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: isMobile ? 17 : 19,
                  fontWeight: 700,
                  color: C.text,
                  lineHeight: 1.25,
                  marginBottom: 12,
                }}
              >
                {s.headline}
              </h3>

              <p
                style={{
                  fontSize: 13,
                  color: s.isFinal ? C.muted : "rgba(232,232,230,0.38)",
                  lineHeight: 1.7,
                  fontFamily: FONT_BODY,
                  marginBottom: s.stat ? 16 : 0,
                }}
              >
                {s.body}
              </p>

              {s.stat && (
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.gold,
                    letterSpacing: "0.06em",
                    fontFamily: FONT_BODY,
                    textTransform: "uppercase",
                  }}
                >
                  {s.stat}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Pull quote with photo */}
        <div
          style={{
            maxWidth: 760,
            margin: isMobile ? "36px auto 0" : "52px auto 0",
            background: "rgba(212,165,116,0.05)",
            border: "1px solid rgba(212,165,116,0.20)",
            borderRadius: 20,
            padding: isMobile ? "28px 22px" : "36px 40px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? 20 : 28,
          }}
        >
          {/* Photo */}
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                width: isMobile ? 64 : 80,
                height: isMobile ? 64 : 80,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid rgba(212,165,116,0.40)",
                background: "rgba(212,165,116,0.08)",
              }}
            >
              <img
                src="https://iili.io/Cxw0jRI.jpg"
                alt="Shu-meez, Owner of PhenomeBeauty"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                }}
              />
            </div>
          </div>

          {/* Quote and attribution */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: isMobile ? 14 : 16,
                color: C.text,
                fontFamily: FONT_BODY,
                lineHeight: 1.7,
                marginBottom: 14,
                fontStyle: "italic",
              }}
            >
              "I set a non-negotiable 50% deposit, so every booking is confirmed with money,
              not messages. I'm no longer chasing payments after appointments."
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.text,
                    fontFamily: FONT_BODY,
                    margin: 0,
                  }}
                >
                  Shu-meez
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    fontFamily: FONT_BODY,
                    margin: 0,
                  }}
                >
                  Owner, PhenomeBeauty · Mobile Beauty Therapist, Cape Town · 17 years in the industry
                </p>
              </div>
              <a
                href="https://www.tiktok.com/@phenomebeauty"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.gold,
                  textDecoration: "none",
                  fontFamily: FONT_BODY,
                  border: "1px solid rgba(212,165,116,0.25)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  background: "rgba(212,165,116,0.05)",
                  whiteSpace: "nowrap",
                }}
              >
                @phenomebeauty
              </a>
            </div>
          </div>
        </div>

        {/* Read full story link */}
        <div style={{ textAlign: "center", marginTop: isMobile ? 24 : 32 }}>
          <Link
            to="/about#case-study"
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontFamily: FONT_BODY,
              fontSize: 13,
              fontWeight: 600,
              color: C.gold,
              textDecoration: "none",
              border: `1px solid rgba(212,165,116,0.28)`,
              borderRadius: 10,
              padding: "12px 22px",
              background: "rgba(212,165,116,0.05)",
              transition: "border-color 0.15s, background 0.15s",
              minHeight: 44,
            }}
          >
            Read the full story
          </Link>
        </div>
      </div>
    </section>
  );
};
