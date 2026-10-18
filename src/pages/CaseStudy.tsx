import { ArrowUpRight, Check } from "lucide-react";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { C, BP, MK, SECTION } from "@/components/home/tokens";
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
  const sectionPad = isMobile ? SECTION.mobile : SECTION.desktop;
  const px = isMobile ? 16 : 24;

  return (
    <MarketingLayout>
      <SiteHeader />
      <main>
        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section
          id="case-study"
          style={{
            padding: isMobile ? SECTION.heroMobile : SECTION.heroDesktop,
            background: C.bg,
          }}
        >
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <p style={MK.eyebrow}>Where NextSlot came from</p>
            <h1 style={MK.h1}>
              It all started with <span style={MK.accent}>PhenomeBeauty.</span>
            </h1>
            <p style={{ ...MK.lead, maxWidth: 600, marginBottom: 24 }}>
              17 years in the beauty industry and 6 years running her own business. 
              NextSlot helped her see her business's patterns, which gave her the confidence to take her side-hustle and turn it into a real business that grows.
              This is her journey and the reason NextSlot exists.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                "Solo operator",
                "Mobile business",
                "No staff",
                "WhatsApp bookings",
                "Proof of payment chaos",
              ].map((tag) => (
                <span key={tag} style={MK.chip}>{tag}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── PULL QUOTE ───────────────────────────────────────────── */}
        <section style={{ padding: `0 ${px}px 40px` }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <blockquote
              style={{
                ...MK.card,
                margin: 0,
                padding: isMobile ? "24px 20px" : "28px 32px",
                borderLeft: `3px solid ${C.gold}`,
              }}
            >
              <p
                style={{
                  ...MK.lead,
                  fontSize: 18,
                  fontWeight: 500,
                  color: C.text,
                  marginBottom: 20,
                }}
              >
                &ldquo;I set a non-negotiable 50% deposit, which directly reduced the amount of no-shows my business had.&rdquo;
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
                  <p style={{ ...MK.small, fontWeight: 700, color: C.text }}>Shu-meez</p>
                  <p style={{ ...MK.small, fontSize: 12 }}>
                    Owner, PhenomeBeauty · Mobile Beauty Therapist, Cape Town ·
                  </p>
                </div>

                <a
                  href="https://www.tiktok.com/@phenomebeauty"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-tiktok-link"
                >
                  <img src={tiktokIcon} alt="" width={20} height={20} loading="lazy" decoding="async" />
                  Watch on TikTok
                </a>
              </div>
            </blockquote>
          </div>
        </section>

        {/* ── TIMELINE ─────────────────────────────────────────────── */}
        <section style={{ padding: `0 ${px}px 64px` }}>
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {timeline.map((card) => (
              <div
                key={card.step}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: isMobile ? "24px 20px" : "28px 32px",
                  ...MK.card,
                  ...(card.isFinal
                    ? {
                        background: "rgba(184,139,82,0.10)",
                        border: "1px solid rgba(184,139,82,0.65)",
                      }
                    : card.isTara
                    ? {
                        background: "transparent",
                        border: "1px dashed rgba(184,139,82,0.55)",
                        boxShadow: "none",
                      }
                    : {}),
                }}
              >
                {!card.isTara && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: 20,
                      bottom: 12,
                      fontFamily: MK.h1.fontFamily,
                      fontSize: 72,
                      fontWeight: 800,
                      lineHeight: 1,
                      pointerEvents: "none",
                      userSelect: "none",
                      color: card.isFinal ? "rgba(184,139,82,0.22)" : "rgba(126,96,58,0.10)",
                    }}
                  >
                    {card.step}
                  </span>
                )}
                <div
                  style={{
                    position: "relative",
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
                        ...MK.eyebrow,
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        margin: "0 0 4px",
                        color: card.isFinal || card.isTara ? "#94672F" : C.faint,
                      }}
                    >
                      {card.version}
                    </p>
                    <h3 style={MK.h3}>{card.label}</h3>
                  </div>
                  {card.isFinal && (
                    <Check style={{ height: 20, width: 20, color: C.goldDim, flexShrink: 0 }} />
                  )}
                </div>
                <ul
                  style={{
                    position: "relative",
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {card.points.map((point) => (
                    <li
                      key={point}
                      style={{
                        ...MK.small,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        fontSize: 14,
                        paddingRight: isMobile ? 0 : 56,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 5,
                          height: 5,
                          background: card.isFinal || card.isTara ? C.gold : C.faint,
                          marginTop: 9,
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
                    className="resources-tiktok-link"
                    style={{ marginTop: 20 }}
                  >
                    Try TARA-S free
                    <ArrowUpRight style={{ height: 14, width: 14 }} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section style={{ padding: `0 ${px}px ${isMobile ? 52 : 68}px` }}>
          <div
            style={{
              ...MK.panel,
              maxWidth: 760,
              margin: "0 auto",
              padding: isMobile ? "40px 24px" : "56px 48px",
            }}
          >
            <p style={MK.eyebrow}>Ready to start?</p>
            <h2 style={MK.h2}>Your booking page is 10 minutes away.</h2>
            <p style={{ ...MK.body, maxWidth: 480, margin: "0 auto 32px" }}>
              No payment required. No technical setup. Just your services, your availability,
              and your booking link ready to share.
            </p>
            <PrimaryCTA to="/onboarding">Create Your Booking Page</PrimaryCTA>
          </div>
        </section>
      </main>
      <SiteFooter />
    </MarketingLayout>
  );
};

export default CaseStudy;
