import { ArrowUpRight, Check } from "lucide-react";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { C, FONT_BODY, BP } from "@/components/home/tokens";
import { useWindowWidth } from "@/components/home/useWindowWidth";
import tiktokIcon from "@/assets/tiktok_1.png";

const timeline = [
  {
    step: "01",
    label: "Where it started",
    version: "The reality",
    isFinal: false,
    isTara: false,
    points: [
      "Bookings came through WhatsApp at all hours, from multiple conversations, with no clear system.",
      "Every confirmation, deposit request, and reminder had to be sent manually, one client at a time.",
      "Messages piled up overnight. Mornings started with an inbox to untangle before any work could begin.",
      "Records had to be created manually, shifting focus away from how the business was actually doing.",
    ],
  },
  {
    step: "02",
    label: "Trying to fix it",
    version: "The workaround",
    isFinal: false,
    isTara: false,
    points: [
      "A Google Form was added to collect booking info. A spreadsheet to track it. A calendar to manage time.",
      "It was better than nothing, but it still required constant manual work to keep it all in sync.",
      "Payments still meant sending banking details, waiting for proof of payment, then manually confirming.",
      "The tools were patched together. Nothing spoke to each other. It was a job on top of the actual job.",
    ],
  },
  {
    step: "03",
    label: "The moment everything changed",
    version: "The shift",
    isFinal: false,
    isTara: false,
    points: [
      "A professional booking system with a real payment gateway. Clients book, choose a time, and pay a deposit without a single message.",
      "Proof of payment gone. A booking is only confirmed once payment clears. Automatically.",
      "The link went into the TikTok bio, Instagram bio, and WhatsApp status. Bookings started arriving on their own.",
      "For the first time, the business felt like it was running itself.",
    ],
  },
  {
    step: "04",
    label: "What the numbers revealed",
    version: "The insight",
    isFinal: false,
    isTara: false,
    points: [
      "Most new clients were coming from TikTok, not Instagram or WhatsApp as assumed. Marketing changed immediately.",
      "Some services made far more per hour than others. Pricing and promotion followed the data.",
      "Certain time slots always filled first. Real demand patterns became visible for the first time.",
      "Clients who had not rebooked in a month surfaced automatically. Follow-up became obvious, not guesswork.",
    ],
  },
  {
    step: "04b",
    label: "The problem no dashboard predicted",
    version: "The unexpected insight",
    isFinal: false,
    isTara: true,
    points: [
      "One pattern kept appearing that no booking system could flag: clients were rescheduling because their periods arrived unexpectedly.",
      "It was not a scheduling problem. It was a biology problem. And it was costing Shu-meez real revenue every month.",
      "So a free tool was built specifically for her clients. A cycle tracker that opens a booking link at exactly the right window in each person's cycle.",
      "That tool is TARA-S. It is free and it is available in English, Afrikaans, isiZulu, and isiXhosa.",
    ],
  },
  {
    step: "05",
    label: "Where it is now",
    version: "The result",
    isFinal: true,
    isTara: false,
    points: [
      "PhenomeBeauty did not just get a booking tool. She got a system that runs her business and advises her every day.",
      "No more chasing payments. No more proof of payments. No more spreadsheets going stale.",
      "The dashboard shows exactly what is happening in real time and surfaces what to do next.",
      "This is why NextSlot exists. Every lesson from building it for a real business is built into the product.",
      "If you run a service business in South Africa, this was built for you.",
    ],
  },
];

/* ─── page ──────────────────────────────────────────────────────── */
const CaseStudy = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <MarketingLayout>
      <SiteHeader />
      <main>
        {/* ── CASE STUDY BANNER ────────────────────────────────────── */}
        <section
          id="case-study"
          style={{
            position: "relative",
            overflow: "hidden",
            background: C.s1,
            borderTop: `1px solid rgba(212,165,116,0.12)`,
            borderBottom: `1px solid rgba(212,165,116,0.12)`,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(212,165,116,0.09) 0%, transparent 70%)",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              maxWidth: 760,
              margin: "0 auto",
              padding: "72px 24px 56px",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: C.gold,
                marginBottom: 12,
                fontFamily: FONT_BODY,
              }}
            >
              Where NextSlot came from
            </p>
            <h2
              style={{
                fontFamily: FONT_BODY,
                fontSize: "clamp(26px,3vw,40px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              It all started with PhenomeBeauty.
            </h2>
            <p
              style={{
                fontSize: 15,
                color: C.muted,
                maxWidth: 560,
                lineHeight: 1.7,
                fontFamily: FONT_BODY,
                marginBottom: 20,
              }}
            >
              Shu-meez has been in the beauty industry for 17 years and has run PhenomeBeauty in
              Cape Town for 6 of them. She was doing everything alone. Bookings on WhatsApp,
              deposits via EFT, schedules in her head and in her diary. This is her journey and the reason
              NextSlot exists.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                "Solo operator",
                "Mobile business",
                "No staff",
                "WhatsApp bookings",
                "Proof of payment chaos",
              ].map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 500,
                    background: "rgba(212,165,116,0.10)",
                    border: "1px solid rgba(212,165,116,0.30)",
                    color: C.gold,
                    fontFamily: FONT_BODY,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── PULL QUOTE ───────────────────────────────────────────── */}
        <section style={{ padding: "48px 24px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <blockquote
              style={{
                borderRadius: 16,
                padding: "28px 32px",
                background: "rgba(212,165,116,0.07)",
                border: "1.5px solid rgba(212,165,116,0.40)",
                boxShadow: "0 4px 24px rgba(212,165,116,0.10)",
              }}
            >
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  lineHeight: 1.6,
                  marginBottom: 20,
                  color: C.text,
                  fontFamily: FONT_BODY,
                }}
              >
                "For the first time, the business felt like it was running itself."
              </p>
        
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                  <img
                    src={tiktokIcon}
                    alt="TikTok"
                    width={26}
                    height={26}
                    loading="lazy"
                    decoding="async"
                    style={{ objectFit: "contain", flexShrink: 0 }}
                  />
                  Watch on TikTok
                </a>
              </div>
            </blockquote>
          </div>
        </section>
        {/* ── TIMELINE ─────────────────────────────────────────────── */}
        <section style={{ padding: "0 24px 56px" }}>
          <div
            style={{
              maxWidth: 640,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {timeline.map((card) => (
              <div
                key={card.step}
                style={{
                  position: "relative",
                  borderRadius: 16,
                  padding: "24px 32px",
                  ...(card.isFinal
                    ? {
                        background: "rgba(212,165,116,0.07)",
                        border: "1.5px solid rgba(212,165,116,0.65)",
                        boxShadow: "0 4px 24px rgba(212,165,116,0.15)",
                      }
                    : card.isTara
                    ? {
                        background: "rgba(212,165,116,0.04)",
                        border: "1px dashed rgba(212,165,116,0.40)",
                      }
                    : {
                        background: C.s1,
                        border: `1px solid ${C.border2}`,
                      }),
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 20,
                    bottom: 16,
                    fontSize: 80,
                    fontWeight: 900,
                    lineHeight: 1,
                    pointerEvents: "none",
                    userSelect: "none",
                    color: card.isFinal
                      ? "rgba(212,165,116,0.12)"
                      : "rgba(232,232,230,0.04)",
                    fontFamily: FONT_BODY,
                  }}
                >
                  {card.isTara ? "" : card.step}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.09em",
                        textTransform: "uppercase",
                        color: card.isFinal ? C.gold : card.isTara ? C.gold : C.faint,
                        marginBottom: 4,
                        fontFamily: FONT_BODY,
                      }}
                    >
                      {card.version}
                    </p>
                    <h3
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 17,
                        fontWeight: 700,
                        color: C.text,
                        lineHeight: 1.2,
                      }}
                    >
                      {card.label}
                    </h3>
                  </div>
                  {card.isFinal && (
                    <Check
                      style={{
                        height: 20,
                        width: 20,
                        color: C.gold,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {card.points.map((point) => (
                    <li
                      key={point}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 13,
                        color: C.muted,
                        fontFamily: FONT_BODY,
                        lineHeight: 1.55,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: card.isFinal || card.isTara ? C.gold : C.faint,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      {point}
                    </li>
                  ))}
                </ul>

                {/* TARA-S inline CTA */}
                {card.isTara && (
                  <a
                    href="https://tara-s.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: FONT_BODY,
                      color: C.gold,
                      border: "1px solid rgba(212,165,116,0.35)",
                      borderRadius: 8,
                      padding: "8px 16px",
                      background: "rgba(212,165,116,0.06)",
                      textDecoration: "none",
                    }}
                  >
                    Try TARA-S free
                    <ArrowUpRight style={{ height: 12, width: 12 }} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA directly after case study ────────────────────────── */}
        <section style={{ padding: "0 24px 80px" }}>
          <div
            style={{
              maxWidth: 640,
              margin: "0 auto",
              borderRadius: 24,
              padding: "48px 40px",
              background: C.s1,
              border: `1px solid rgba(212,165,116,0.25)`,
              boxShadow: "0 8px 40px -8px rgba(0,0,0,0.5)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: C.gold,
                marginBottom: 16,
                fontFamily: FONT_BODY,
              }}
            >
              Ready to start?
            </p>
            <h2
              style={{
                fontFamily: FONT_BODY,
                fontSize: "clamp(22px,2.4vw,32px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.15,
                marginBottom: 16,
              }}
            >
              Your booking page is 10 minutes away.
            </h2>
            <p
              style={{
                fontSize: 15,
                color: C.muted,
                lineHeight: 1.7,
                maxWidth: 420,
                margin: "0 auto 32px",
                fontFamily: FONT_BODY,
              }}
            >
              No payment required. No technical setup. Just your services, your availability,
              and your booking link ready to share.
            </p>
            <PrimaryCTA to="/onboarding">Create Your Booking Page</PrimaryCTA>
          </div>
        </section>

        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(212,165,116,0.4), transparent)",
          }}
        />


      </main>
      <SiteFooter />
    </MarketingLayout>
  );
};

export default CaseStudy;
