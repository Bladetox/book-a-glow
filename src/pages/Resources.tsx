import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Clock, ExternalLink } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";

/* ─── constants ─────────────────────────────────────────────────── */
const CTA_BG =
  "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW =
  "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

/* ─── tool data ─────────────────────────────────────────────────── */
type Tool = {
  label: string;
  name: string;
  tagline: string;
  description: string;
  cta: string;
  url: string;
  tag: string;
  taraNote?: boolean;
};

const tools: Tool[] = [
  {
    label: "Funding Directory",
    name: "Vula",
    tagline: "Find South African business funding you actually qualify for.",
    description:
      "A free directory of verified grants, loans, and support programmes for South African SMEs. Filter by business stage; informal, registered, or looking to formalise. Funders include Yoco Capital, Lula, Merchant Capital, and more.",
    cta: "Find Funding",
    url: "https://vula-lac.vercel.app/",
    tag: "Free tool",
  },
  {
    label: "Business Readiness Quiz",
    name: "Just Start Quiz",
    tagline: "10 questions. Find out which business model fits you.",
    description:
      "A quick self-assessment that tells you whether a product business, a service business, or a hybrid suits your strengths and situation. No email required. No data collected. Takes 3 minutes.",
    cta: "Take the Quiz",
    url: "https://juststart-quiz.vercel.app/",
    tag: "Free tool",
  },
  {
    label: "Cycle Tracker for Clients",
    name: "TARA-S",
    tagline: "Built for beauty and wellness clients who reschedule around their cycle.",
    description:
      "TARA-S was built after noticing that clients of PhenomeBeauty, a mobile beauty therapist in Cape Town, kept rescheduling because their periods arrived unexpectedly. The tool tracks each client's cycle and surfaces a booking link at exactly the right window. Free, available in English, Afrikaans, isiZulu, and isiXhosa.",
    cta: "Give This to Your Clients",
    url: "https://tara-s.vercel.app/",
    tag: "Free tool",
    taraNote: true,
  },
];

/* ─── article data ───────────────────────────────────────────────── */
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

const categoryOpacity: Record<Exclude<Category, "All">, string> = {
  Business: "0.80",
  Operations: "0.55",
  Finance: "0.35",
};

/* ─── sub-components ────────────────────────────────────────────── */
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
const Resources = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const featured = articles.find((a) => a.featured);
  const isFiltered = activeCategory !== "All";
  const showFeatured = !isFiltered || featured?.category === activeCategory;
  const grid = articles
    .filter((a) => !a.featured)
    .filter((a) => !isFiltered || a.category === activeCategory);

  return (
    <MarketingLayout>
      <style>{`
        .resources-tools-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .resources-featured-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(212,165,116,0.22);
          text-decoration: none;
          margin-bottom: 32px;
          transition: border-color 0.2s;
        }
        .resources-featured-image {
          overflow: hidden;
          position: relative;
          min-height: 260px;
        }
        .resources-featured-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .resources-blog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        @media (max-width: 768px) {
          .resources-tools-grid {
            grid-template-columns: 1fr;
          }
          .resources-featured-grid {
            grid-template-columns: 1fr;
          }
          .resources-featured-image {
            min-height: 200px;
            max-height: 220px;
          }
          .resources-blog-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .resources-tools-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .resources-blog-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <SiteHeader />
      <main>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            background: C.s1,
            borderBottom: `1px solid rgba(212,165,116,0.12)`,
          }}
        >
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
              maxWidth: 760,
              margin: "0 auto",
              padding: "72px 24px 64px",
              position: "relative",
              zIndex: 1,
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
              Resources
            </p>
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(28px, 3.2vw, 44px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              Free tools and thinking
              <br />
              <span style={{ color: C.gold, fontStyle: "italic" }}>for SA business owners.</span>
            </h1>
            <p
              style={{
                fontSize: 15,
                color: C.muted,
                lineHeight: 1.75,
                maxWidth: 520,
                fontFamily: FONT_BODY,
              }}
            >
              Everything here is free. No sign-up walls. No upsells. Just tools and articles built
              to help service businesses in South Africa make better decisions.
            </p>
          </div>
        </section>

        {/* ── FREE TOOLS ───────────────────────────────────────────── */}
        <section style={{ padding: "64px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
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
                Free Tools
              </p>
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "clamp(20px, 2.2vw, 28px)",
                  fontWeight: 700,
                  color: C.text,
                  lineHeight: 1.2,
                }}
              >
                Built to solve real problems.
              </h2>
            </div>

            <div className="resources-tools-grid">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 16,
                    background: C.s2,
                    border: `1px solid rgba(212,165,116,0.20)`,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      pointerEvents: "none",
                      position: "absolute",
                      top: -32,
                      right: -32,
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(212,165,116,0.10) 0%, transparent 70%)",
                    }}
                  />
                  <div style={{ padding: "28px 28px 0", position: "relative" }}>
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
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: C.gold,
                          fontFamily: FONT_BODY,
                        }}
                      >
                        {tool.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: C.muted,
                          fontFamily: FONT_BODY,
                          background: "rgba(212,165,116,0.08)",
                          border: "1px solid rgba(212,165,116,0.18)",
                          borderRadius: 100,
                          padding: "2px 8px",
                        }}
                      >
                        {tool.tag}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 22,
                        fontWeight: 700,
                        color: C.text,
                        lineHeight: 1.15,
                        marginBottom: 8,
                      }}
                    >
                      {tool.name}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        fontFamily: FONT_BODY,
                        marginBottom: 12,
                        lineHeight: 1.4,
                      }}
                    >
                      {tool.tagline}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: C.muted,
                        lineHeight: 1.65,
                        fontFamily: FONT_BODY,
                        marginBottom: tool.taraNote ? 8 : 0,
                      }}
                    >
                      {tool.description}
                    </p>
                    {tool.taraNote && (
                      <p
                        style={{
                          fontSize: 12,
                          color: C.gold,
                          fontFamily: FONT_BODY,
                          fontStyle: "italic",
                          lineHeight: 1.5,
                          marginTop: 4,
                        }}
                      >
                        Originally built for PhenomeBeauty clients. Works for any beauty or
                        wellness business.
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: "auto",
                      padding: "24px 28px 28px",
                    }}
                  >
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: FONT_BODY,
                        color: C.text,
                        background: "rgba(212,165,116,0.10)",
                        border: "1px solid rgba(212,165,116,0.35)",
                        borderRadius: 10,
                        padding: "10px 18px",
                        textDecoration: "none",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = "rgba(212,165,116,0.18)";
                        el.style.borderColor = "rgba(212,165,116,0.55)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = "rgba(212,165,116,0.10)";
                        el.style.borderColor = "rgba(212,165,116,0.35)";
                      }}
                    >
                      {tool.cta}
                      <ExternalLink style={{ height: 13, width: 13, color: C.gold }} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(212,165,116,0.4), transparent)",
            margin: "0 24px",
          }}
        />

        {/* ── ARTICLES ─────────────────────────────────────────────── */}
        <section style={{ background: C.s1, padding: "64px 24px" }}>
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
                  Articles
                </p>
                <h2
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: "clamp(20px, 2.2vw, 28px)",
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
                      minHeight: 44,
                      minWidth: 44,
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
                className="resources-featured-grid"
                style={{
                  background: C.s2,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.50)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,165,116,0.22)";
                }}
              >
                <div className="resources-featured-image">
                  {featured.image ? (
                    <img
                      src={featured.image}
                      alt={featured.title}
                      loading="lazy"
                      decoding="async"
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
              <div className="resources-blog-grid">
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
              padding: "clamp(32px, 6vw, 56px) clamp(24px, 5vw, 48px)",
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
              Your booking page is 10 minutes away.
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

        <SiteFooter />
      </main>
    </MarketingLayout>
  );
};

export default Resources;
