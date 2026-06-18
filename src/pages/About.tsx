import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Clock, Check } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";

/* ─── constants ─────────────────────────────────────────────────── */
const FEATURES_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=80";

const CTA_BG =
  "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW =
  "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

/* ─── blog data ─────────────────────────────────────────────────── */
type Category = "All" | "Business" | "Operations" | "Finance";
type Article = {
  title: string;
  excerpt: string;
  category: Exclude<Category, "All">;
  readTime: string;
  date: string;
  url: string;
  image?: string;
  featured?: boolean;
};

const articles: Article[] = [
  {
    title: "You Don't Own Your Marketplace Sales and That's the Problem",
    excerpt:
      "Selling on Takealot, Etsy, or Amazon feels like growth. But when the platform changes its algorithm, raises its fees, or suspends your account, you have nothing. Here is what business owners need to understand before it is too late.",
    category: "Business",
    readTime: "5 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/you-dont-own-your-marketplace-sales-and-that-s-the-problem-efcc7da7b47a",
    image: "https://miro.medium.com/v2/resize:fit:1200/1*ecSZfaS4k95AOE1VTQ1UYA@2x.jpeg",
    featured: true,
  },
  {
    title: "Sole Proprietor vs Pty Ltd in South Africa: Which One Fits Your Next 5 Years?",
    excerpt:
      "The structure you start with is rarely the one that serves you later. This is a clear breakdown of what each option actually means for your taxes, liability, and ability to grow, without the legal jargon.",
    category: "Finance",
    readTime: "6 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/sole-proprietor-vs-pty-ltd-in-south-africa-which-one-fits-your-next-5-years-f5e10847ccc9",
    image: "https://miro.medium.com/v2/resize:fit:1200/1*4y1EyPtlU_mgZSJJcgiIEQ@2x.jpeg",
  },
  {
    title: "Why Your SSME Needs a Delivery Strategy, Not a Delivery Hope",
    excerpt:
      "Most small service businesses deliver inconsistently, not because they lack skill, but because they have no system. The difference between a one-person operation and a scalable business is almost always a delivery process.",
    category: "Operations",
    readTime: "5 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/why-your-ssme-needs-a-delivery-strategy-not-a-delivery-hope-0acf3cfb99ea",
    image: "https://miro.medium.com/v2/resize:fit:1400/1*WnlZmve6pYPhgYXQ39OiWA.png",
  },
  {
    title: "Why South African SMEs Need to Act Now on Digital Payments (2025 to 2026)",
    excerpt:
      "The window to get ahead of digital payments in South Africa is narrowing. Customers expect it, competitors are adopting it, and the cost of staying cash-only is compounding. Here is what the data says and what to do about it.",
    category: "Finance",
    readTime: "5 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/why-south-african-smes-need-to-act-now-on-digital-payments-2025-2026-0a68b755ec79",
    image: "https://miro.medium.com/v2/resize:fit:1400/1*Zn7_--DsP_XvtRjHTPLqnA@2x.jpeg",
  },
];

const categories: Category[] = ["All", "Business", "Operations", "Finance"];

/* ─── case study timeline ───────────────────────────────────────── */
const timeline = [
  {
    step: "01",
    label: "Where it started",
    version: "The reality",
    isFinal: false,
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
    points: [
      "Most new clients were coming from TikTok, not Instagram or WhatsApp as assumed. Marketing changed immediately.",
      "Some services made far more per hour than others. Pricing and promotion followed the data.",
      "Certain time slots always filled first. Real demand patterns became visible for the first time.",
      "Clients who had not rebooked in a month surfaced automatically. Follow-up became obvious, not guesswork.",
    ],
  },
  {
    step: "05",
    label: "Where it is now",
    version: "The result",
    isFinal: true,
    points: [
      "PhenomeBeauty did not just get a booking tool. They got a system that runs the business and advises the owner every day.",
      "No more chasing payments. No more proof of payments. No more spreadsheets going stale.",
      "The dashboard shows exactly what is happening in real time and surfaces what to do next.",
      "This is why NextSlot exists. Every lesson from building it for a real business is built into the product.",
      "If you run a service business in South Africa, this was built for you.",
    ],
  },
];

/* ─── sub-components ────────────────────────────────────────────── */
const categoryOpacity: Record<Exclude<Category, "All">, string> = {
  Business: "0.80",
  Operations: "0.55",
  Finance: "0.35",
};

const CategoryChip = ({
  category,
  small = false,
}: {
  category: Exclude<Category, "All">;
  small?: boolean;
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 100,
      fontWeight: 600,
      border: `1px solid rgba(212,165,116,0.30)`,
      background: `rgba(212,165,116,${categoryOpacity[category]})`,
      color: C.text,
      padding: small ? "2px 8px" : "2px 10px",
      fontSize: small ? 10 : 11,
      fontFamily: FONT_BODY,
    }}
  >
    {category}
  </span>
);

const FallbackBand = ({ tall = false }: { tall?: boolean }) => (
  <div
    style={{
      width: "100%",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: tall ? 176 : 128,
      background: `linear-gradient(135deg, rgba(212,165,116,0.18) 0%, ${C.s2} 100%)`,
      borderBottom: `1px solid rgba(212,165,116,0.12)`,
    }}
  >
    <span
      style={{
        fontSize: 30,
        fontWeight: 600,
        color: "rgba(212,165,116,0.25)",
        fontFamily: FONT_DISPLAY,
      }}
    >
      NS
    </span>
  </div>
);

const CoverImage = ({
  src,
  alt,
  tall = false,
}: {
  src?: string;
  alt: string;
  tall?: boolean;
}) => {
  if (!src) return <FallbackBand tall={tall} />;
  return (
    <div
      style={{
        width: "100%",
        flexShrink: 0,
        overflow: "hidden",
        height: tall ? 176 : 128,
        borderBottom: `1px solid rgba(212,165,116,0.12)`,
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transition: "transform 0.5s",
        }}
        onError={(e) => {
          (e.currentTarget.parentElement as HTMLElement).innerHTML = "";
        }}
      />
    </div>
  );
};

/* ─── page ──────────────────────────────────────────────────────── */
const About = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
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

  const featured = articles.find((a) => a.featured);
  const isFiltered = activeCategory !== "All";
  const showFeatured = !isFiltered || featured?.category === activeCategory;
  const grid = articles
    .filter((a) => !a.featured)
    .filter((a) => !isFiltered || a.category === activeCategory);

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
                  Built from real problems.
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
                  service businesses. Designed with the reality of this market in mind, not a generic
                  global template.
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
                  <ArrowRight style={{ height: 16, width: 16 }} />
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
                      { label: "Setup time", value: "20 min" },
                      { label: "Trial", value: "30 days free" },
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
              tattoo artists, massage therapists and independent creatives work long hours, build loyal
              communities, and carry the pressure of keeping their businesses running day after day.
              Yet the tools available to them often feel disconnected from how their businesses
              actually work.
            </p>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              NextSlot was created to change that.
            </p>
          </div>
        </section>

        {/* ── THE IDEA ─────────────────────────────────────────────── */}
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
              understand their data, and make smarter decisions. But the goal goes beyond software.
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
                Technology should feel like part of your business, not something imposed on it.
              </p>
            </blockquote>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              Instead of complicated dashboards, generic automation, and advice that ignores
              real-world conditions, NextSlot focuses on context. It looks at what is actually
              happening inside your business and turns that information into practical insights you
              can use.
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
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              In a market like South Africa, where raising prices, losing clients, or making the
              wrong decision can have real consequences, businesses need tools that are street smart
              as well as professional. NextSlot was designed with that reality in mind.
            </p>
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
              Creative service businesses are deeply human. NextSlot respects that.
            </p>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              The platform is designed to feel familiar and supportive rather than cold or overly
              technical. It fits naturally into the way creative professionals already run their
              businesses, helping them stay organised, understand their growth, and serve their clients
              better.
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
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(22px,2.4vw,30px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.2,
              }}
            >
              Arshad Segal
            </h2>
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
                  Watch on TikTok
                  <ArrowUpRight style={{ height: 14, width: 14, color: C.gold }} />
                </span>
              </div>
            </a>

            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              NextSlot is a practical extension of that mindset, a tool created to help everyday
              business owners take the next step, make better decisions, and grow with confidence.
            </p>
          </div>
        </section>

        {/* ── MISSION ─────────────────────────────────────────────── */}
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
              Our Mission
            </p>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(22px,2.4vw,30px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.3,
              }}
            >
              To give service businesses tools that feel like they were built by someone who
              actually understands their world.
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "Not overly complex.",
                "Not disconnected from reality.",
                "Just useful, thoughtful technology that helps businesses move forward.",
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
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
              Because behind every booking, every client, and every small studio is a person working
              hard to build something meaningful. NextSlot exists to support that journey.
            </p>
          </div>
        </section>

        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(212,165,116,0.4), transparent)",
          }}
        />

        {/* ── CASE STUDY ───────────────────────────────────────────── */}
        <section
          id="case-study"
          style={{
            position: "relative",
            width: "100%",
            minHeight: 360,
            display: "flex",
            alignItems: "flex-end",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <img
              src={FEATURES_IMAGE}
              alt="PhenomeBeauty"
              fetchPriority="low"
              decoding="async"
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to bottom, rgba(8,8,8,0.30) 0%, rgba(8,8,8,0.92) 80%, #080808 100%)`,
              }}
            />
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 10,
              width: "100%",
              maxWidth: 760,
              margin: "0 auto",
              padding: "128px 24px 56px",
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
              }}
            >
              A mobile beauty studio owner doing everything alone. Bookings on WhatsApp, deposits
              via EFT, schedules in her head. This is her journey and the reason NextSlot exists.
            </p>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
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

        {/* Pull quote */}
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
                  marginBottom: 12,
                  color: C.text,
                  fontFamily: FONT_BODY,
                }}
              >
                "For the first time, the business felt like it was running itself."
              </p>
              <footer style={{ fontSize: 13, color: C.gold, fontFamily: FONT_BODY }}>
                PhenomeBeauty, NextSlot customer
              </footer>
            </blockquote>
          </div>
        </section>

        {/* Timeline */}
        <section style={{ padding: "40px 24px" }}>
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
                  {card.step}
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
                        color: card.isFinal ? C.gold : C.faint,
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
                          background: card.isFinal ? C.gold : C.faint,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── BLOG ─────────────────────────────────────────────────── */}
        <section
          id="blog"
          style={{ background: C.s1, padding: "80px 24px" }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 36,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: C.gold,
                    marginBottom: 8,
                    fontFamily: FONT_BODY,
                  }}
                >
                  Resources
                </p>
                <h2
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: "clamp(22px,2.4vw,30px)",
                    fontWeight: 700,
                    color: C.text,
                    lineHeight: 1.15,
                  }}
                >
                  For business owners who think ahead.
                </h2>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 100,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: FONT_BODY,
                      cursor: "pointer",
                      border: `1px solid ${
                        activeCategory === cat
                          ? "rgba(212,165,116,0.60)"
                          : "rgba(212,165,116,0.20)"
                      }`,
                      background:
                        activeCategory === cat
                          ? "rgba(212,165,116,0.14)"
                          : "transparent",
                      color: activeCategory === cat ? C.text : C.muted,
                      transition: "all 0.15s",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Featured article */}
            {showFeatured && featured && (
              <a
                href={featured.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 0,
                  borderRadius: 20,
                  overflow: "hidden",
                  border: `1px solid rgba(212,165,116,0.22)`,
                  textDecoration: "none",
                  background: C.s2,
                  marginBottom: 32,
                  transition: "border-color 0.2s",
                }}
                className="about-featured-grid"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.50)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.22)";
                }}
              >
                <div
                  style={{
                    overflow: "hidden",
                    position: "relative",
                    minHeight: 260,
                  }}
                >
                  {featured.image ? (
                    <img
                      src={featured.image}
                      alt={featured.title}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <FallbackBand tall />
                  )}
                </div>
                <div
                  style={{
                    padding: "36px 36px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CategoryChip category={featured.category} />
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          color: C.faint,
                          fontFamily: FONT_BODY,
                        }}
                      >
                        <Clock style={{ height: 10, width: 10 }} />
                        {featured.readTime}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: "clamp(17px,1.6vw,22px)",
                        fontWeight: 700,
                        color: C.text,
                        lineHeight: 1.25,
                      }}
                    >
                      {featured.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: C.muted,
                        lineHeight: 1.65,
                        fontFamily: FONT_BODY,
                      }}
                    >
                      {featured.excerpt}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.gold,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    Read on Medium
                    <ArrowUpRight style={{ height: 13, width: 13 }} />
                  </div>
                </div>
              </a>
            )}

            {/* Grid */}
            {grid.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 20,
                }}
                className="about-blog-grid"
              >
                {grid.map((article) => (
                  <a
                    key={article.title}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: 16,
                      overflow: "hidden",
                      border: `1px solid rgba(212,165,116,0.18)`,
                      background: C.s2,
                      textDecoration: "none",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.45)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.18)";
                    }}
                  >
                    <CoverImage src={article.image} alt={article.title} />
                    <div
                      style={{
                        padding: "20px 20px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        flex: 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CategoryChip category={article.category} small />
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 10,
                            color: C.faint,
                            fontFamily: FONT_BODY,
                          }}
                        >
                          <Clock style={{ height: 9, width: 9 }} />
                          {article.readTime}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.text,
                          lineHeight: 1.3,
                          flex: 1,
                        }}
                      >
                        {article.title}
                      </h3>
                      <p
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          lineHeight: 1.6,
                          fontFamily: FONT_BODY,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        } as React.CSSProperties}
                      >
                        {article.excerpt}
                      </p>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: C.gold,
                          fontFamily: FONT_BODY,
                          marginTop: 4,
                        }}
                      >
                        Read on Medium
                        <ArrowUpRight style={{ height: 11, width: 11 }} />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {isFiltered && grid.length === 0 && !showFeatured && (
              <p
                style={{
                  fontSize: 14,
                  color: C.muted,
                  fontFamily: FONT_BODY,
                  textAlign: "center",
                  padding: "40px 0",
                }}
              >
                No articles in this category yet.
              </p>
            )}
          </div>
        </section>

        {/* ── CTA BANNER ───────────────────────────────────────────── */}
        <section style={{ padding: "80px 24px" }}>
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              borderRadius: 24,
              padding: "56px 48px",
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
                fontSize: "clamp(24px,2.8vw,36px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.15,
                marginBottom: 16,
              }}
            >
              Your booking page is 20 minutes away.
            </h2>
            <p
              style={{
                fontSize: 15,
                color: C.muted,
                lineHeight: 1.7,
                maxWidth: 480,
                margin: "0 auto 32px",
                fontFamily: FONT_BODY,
              }}
            >
              No payment required. No technical setup. Just your services, your availability, and
              your booking link ready to share.
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
              <ArrowRight style={{ height: 16, width: 16 }} />
            </Link>
          </div>
        </section>

        <SiteFooter />
      </main>
    </MarketingLayout>
  );
};

export default About;
