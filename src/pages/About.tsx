import tiktokIcon from "@/assets/tiktok_1.png";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";

/* ─── page ──────────────────────────────────────────────────────── */
/* ───────────────────────────────────────── */
const About = () => {
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
                <PrimaryCTA to="/onboarding">Create Your Booking Page</PrimaryCTA>
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
                    width={26}
                    height={26}
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
