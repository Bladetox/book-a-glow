import tiktokIcon from './assets/tiktok_1.png'
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";

/* ─── constants ─────────────────────────────────────────────────── */
const CTA_BG =
  "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW =
  "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

/* ─── case study timeline ───────────────────────────────────────── */
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
const About = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 80;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }, [hash]);

  return (
    <MarketingLayout>
      <SiteHeader />
      <main>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section style={{ position: "relative", overflow: "hidden", background: C.s1 }}>
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,165,116,0.07) 0%, transparent 70%)",
            }}
          />
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 1,
              background:
                "linear-gradient(180deg, transparent, rgba(212,165,116,0.18), transparent)",
            }}
          />
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 72px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 64,
                alignItems: "center",
              }}
              className="about-hero-grid"
            >
              {/* LEFT */}
              <div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}
                >
                  <img
                    src="/web-app-manifest-192x192.png"
                    alt="NextSlot"
                    width={44}
                    height={44}
                    loading="lazy"
                    decoding="async"
                    style={{
                      borderRadius: 12,
                      objectFit: "contain",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                    }}
                  />
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      color: C.gold,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    About NextSlot
                  </p>
                </div>
                <h1
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: "clamp(32px, 3.8vw, 52px)",
                    fontWeight: 700,
                    color: C.text,
                    lineHeight: 1.08,
                    marginBottom: 20,
                  }}
                >
                  Built from real challenges.
                  <br />
                  <span style={{ color: C.gold, fontStyle: "italic" }}>Not a boardroom.</span>
                </h1>
                <p
                  style={{
                    fontSize: 16,
                    color: C.muted,
                    lineHeight: 1.7,
                    maxWidth: 440,
                    marginBottom: 32,
                    fontFamily: FONT_BODY,
                  }}
                >
                  NextSlot is a booking and business intelligence platform built for South African
                  service businesses. PayFast, Yoco, and PayShap are built in, not bolted on.
                  No workarounds. No sending banking details on WhatsApp.
                </p>
                <Link
                  to="/onboarding"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: CTA_BG,
                    boxShadow: CTA_SHADOW,
                    color: "#080808",
                    fontFamily: FONT_BODY,
                    fontSize: 14,
                    fontWeight: 700,
                    padding: "13px 28px",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  Create Your Booking Page
                </Link>
              </div>

              {/* RIGHT: founder's belief card */}
              <div
                className="about-belief-card"
                style={{
                  borderRadius: 20,
                  padding: "40px",
                  position: "relative",
                  overflow: "hidden",
                  background: C.s2,
                  border: `1px solid rgba(212,165,116,0.30)`,
                  boxShadow: "0 8px 40px -8px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  style={{
                    pointerEvents: "none",
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 200,
                    height: 200,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(212,165,116,0.12) 0%, transparent 70%)",
                  }}
                />
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: C.gold,
                    marginBottom: 24,
                    fontFamily: FONT_BODY,
                  }}
                >
                  The Founder's Belief
                </p>
                <blockquote style={{ position: "relative" }}>
                  <p
                    className="belief-quote"
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 22,
                      fontWeight: 600,
                      color: C.text,
                      lineHeight: 1.3,
                      marginBottom: 12,
                    }}
                  >
                    "Sometimes the biggest barrier to progress is waiting too long to start."
                  </p>
                  <footer style={{ fontSize: 13, color: C.muted, fontFamily: FONT_BODY }}>
                    Arshad Segal, Founder of NextSlot
                  </footer>
                </blockquote>
                <div
                  style={{
                    marginTop: 28,
                    paddingTop: 24,
                    borderTop: `1px solid rgba(212,165,116,0.20)`,
                  }}
                >
                  <div
                    className="belief-stats-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
                  >
                    {[
                      { label: "Booking types", value: "Any service" },
                      { label: "Built for", value: "South Africa" },
                      { label: "Setup time", value: "10 min" },
                      { label: "Trial", value: "7 days (Starter) / 30 days (Flow+)" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: C.muted,
                            marginBottom: 2,
                            fontFamily: FONT_BODY,
                          }}
                        >
                          {item.label}
                        </p>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.text,
                            fontFamily: FONT_BODY,
                          }}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(212,165,116,0.4), transparent)",
          }}
        />

        {/* ── ORIGIN ───────────────────────────────────────────────── */}
        <section style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              In South Africa, service businesses operate in one of the most competitive and
              price-sensitive environments in the world. Barbers, beauty studios, nail technicians,
              tattoo artists, massage therapists and independent creatives work long hours, build
              loyal communities, and carry the pressure of keeping their businesses running day
              after day. Yet the tools available to them often feel disconnected from how their
              businesses actually work.
            </p>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              NextSlot was created to change that. Not with a generic global template, but with
              something built from a real business, in this market, solving real problems.
            </p>
          </div>
        </section>

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
                fontFamily: FONT_DISPLAY,
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
                    Owner, PhenomeBeauty · Mobile Beauty Therapist, Cape Town · 17 years in the
                    industry
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
                    width={20}
                    height={20}
                    loading="lazy"
                    decoding="async"
                    style={{ objectFit: "contain", flexShrink: 0 }}
                  />
                  Watch on TikTok
              </a> 
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
                    fontFamily: FONT_DISPLAY,
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
                        fontFamily: FONT_DISPLAY,
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
                fontFamily: FONT_DISPLAY,
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
            <Link
              to="/onboarding"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: CTA_BG,
                boxShadow: CTA_SHADOW,
                color: "#080808",
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontWeight: 700,
                padding: "14px 32px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Create Your Booking Page
            </Link>
          </div>
        </section>

        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(212,165,116,0.4), transparent)",
          }}
        />

        {/* ── THE IDEA + MISSION merged ─────────────────────────────── */}
        <section style={{ background: C.s1, padding: "64px 24px" }}>
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: C.gold,
                fontFamily: FONT_BODY,
              }}
            >
              The Idea Behind NextSlot
            </p>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(22px,2.4vw,30px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.2,
              }}
            >
              Technology that feels like part of your business.
            </h2>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              NextSlot is a platform designed to help service-based businesses manage bookings,
              understand their data, and make smarter decisions. The goal goes beyond software.
            </p>
            <blockquote
              style={{
                borderLeft: `2px solid ${C.gold}`,
                paddingLeft: 20,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.text,
                  fontFamily: FONT_BODY,
                }}
              >
                The vision is simple.
              </p>
              <p
                style={{
                  fontSize: 15,
                  color: C.muted,
                  fontStyle: "italic",
                  fontFamily: FONT_BODY,
                }}
              >
                To give service businesses tools that feel like they were built by someone who
                actually understands their world. Not overly complex. Not disconnected from
                reality. Just useful, thoughtful technology that helps businesses move forward.
              </p>
            </blockquote>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              In a market like South Africa, where raising prices, losing clients, or making the
              wrong decision can have real consequences, businesses need tools that are street
              smart as well as professional. Because behind every booking, every client, and every
              small studio is a person working hard to build something meaningful. NextSlot exists
              to support that journey.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "Not guru advice.",
                "Not guesswork.",
                "Real insights based on your business' real data.",
              ].map((line) => (
                <p
                  key={line}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.text,
                    fontFamily: FONT_BODY,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* ── BUILT FOR CREATIVES ──────────────────────────────────── */}
        <section style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: C.gold,
                fontFamily: FONT_BODY,
              }}
            >
              A Platform Built for Creatives
            </p>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(22px,2.4vw,30px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.2,
              }}
            >
              Relationships matter. Community matters. Reputation matters.
            </h2>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              Creative service businesses are deeply human. NextSlot respects that. The platform
              is designed to feel familiar and supportive rather than cold or overly technical.
              It fits naturally into the way creative professionals already run their businesses,
              helping them stay organised, understand their growth, and serve their clients better.
            </p>
            <blockquote
              style={{ borderLeft: `2px solid ${C.gold}`, paddingLeft: 20 }}
            >
              <p
                style={{
                  fontSize: 15,
                  color: C.muted,
                  fontStyle: "italic",
                  fontFamily: FONT_BODY,
                }}
              >
                It is technology that works quietly in the background while the real craft stays
                front and center.
              </p>
            </blockquote>
          </div>
        </section>

        {/* ── FOUNDER ─────────────────────────────────────────────── */}
        <section style={{ background: C.s1, padding: "64px 24px" }}>
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: C.gold,
                fontFamily: FONT_BODY,
              }}
            >
              The Founder
            </p>
        
            {/* name + photo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <img
                src="https://iili.io/C9Ktrhu.jpg"
                alt="Arshad Segal, Founder of NextSlot"
                width={72}
                height={72}
                loading="lazy"
                decoding="async"
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  objectPosition: "center top",
                  flexShrink: 0,
                  width: 72,
                  height: 72,
                  minWidth: 72,
                  minHeight: 72,
                  border: "2px solid rgba(212,165,116,0.40)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                }}
              />
              <div>
                <h2
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: "clamp(22px,2.4vw,30px)",
                    fontWeight: 700,
                    color: C.text,
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  Arshad Segal
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    fontFamily: FONT_BODY,
                    margin: "4px 0 0",
                  }}
                >
                  Founder of NextSlot
                </p>
              </div>
            </div>
        
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              NextSlot was founded by Arshad Segal, an entrepreneur and builder driven by a simple
              belief.
            </p>
        
            <blockquote
              style={{ borderLeft: `2px solid ${C.gold}`, paddingLeft: 20 }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.text,
                  fontStyle: "italic",
                  fontFamily: FONT_BODY,
                }}
              >
                Sometimes the biggest barrier to progress is waiting too long to start.
              </p>
            </blockquote>
        
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              Arshad has always been drawn to ideas that combine creativity, technology, and human
              behaviour. His work often sits at the intersection of entrepreneurship, storytelling,
              and systems thinking. He believes that when people are given the right tools and a
              clear path forward, they can build extraordinary things from ordinary beginnings.
            </p>
        
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              This philosophy is reflected in his broader creative work and personal brand, centred
              on one belief he returns to constantly:
            </p>

            {/* Just Start / chasing_dweams card */}
            <a
              href="https://www.tiktok.com/@chasing_dweams?_r=1&_t=ZS-94gSp7To9iS"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                borderRadius: 16,
                overflow: "hidden",
                textDecoration: "none",
                background: C.s2,
                border: `1px solid rgba(212,165,116,0.27)`,
                boxShadow: `0 0 0 1px rgba(212,165,116,0.10)`,
                transition: "border-color 0.2s, box-shadow 0.2s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(212,165,116,0.55)";
                el.style.boxShadow = `0 0 28px 0 rgba(212,165,116,0.22), 0 8px 32px rgba(0,0,0,0.4)`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(212,165,116,0.27)";
                el.style.boxShadow = `0 0 0 1px rgba(212,165,116,0.10)`;
              }}
            >
              <div
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  top: -32,
                  right: -32,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(212,165,116,0.18) 0%, transparent 70%)`,
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  padding: "28px 32px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      color: C.gold,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    Personal brand / TikTok
                  </p>
                  <p
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 36,
                      fontWeight: 700,
                      color: C.text,
                      lineHeight: 1,
                    }}
                  >
                    Just Start.
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: C.muted,
                      maxWidth: 280,
                      lineHeight: 1.6,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    Creativity, entrepreneurship, and the courage to begin. Follow the journey on
                    TikTok.
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.muted,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    @chasing_dweams
                  </p>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONT_BODY,
                    padding: "10px 20px",
                    borderRadius: 10,
                    flexShrink: 0,
                    background: `rgba(212,165,116,0.12)`,
                    border: `1px solid rgba(212,165,116,0.35)`,
                    color: C.text,
                  }}
                >
                    <img
                    src={tiktokIcon}
                    alt="TikTok"
                    width={20}
                    height={20}
                    loading="lazy"
                    decoding="async"
                    style={{ objectFit: "contain", flexShrink: 0 }}
                  />
                  Watch on TikTok
                </span>
              </div>
            </a>

            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              NextSlot is a practical extension of that mindset, a tool created to help everyday
              business owners take the next step, make better decisions, and grow with confidence.
            </p>
          </div>
        </section>

        <SiteFooter />
      </main>
    </MarketingLayout>
  );
};

export default About;
