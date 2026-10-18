import { useState } from "react";
import { ArrowUpRight, Clock, ExternalLink } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { C, FONT_BODY, FONT_DISPLAY, MK, SECTION } from "@/components/home/tokens";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import tiktokIcon from "@/assets/tiktok_1.png";

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
      "A free directory of verified grants, loans, and support programmes for South African SMEs. Filter by business stage; informal, registered, or looking to formalise.",
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
      "TARA-S was built after noticing that clients of PhenomeBeauty, a mobile beauty therapist in Cape Town, kept rescheduling because their periods arrived unexpectedly. Free, available in English, Afrikaans, isiZulu, and isiXhosa.",
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
      borderRadius: 12,
      fontWeight: 600,
      border: `1px solid rgba(184,139,82,0.30)`,
      background: `rgba(184,139,82,${categoryOpacity[category]})`,
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
      background: `linear-gradient(135deg, rgba(184,139,82,0.18) 0%, ${C.s2} 100%)`,
      borderBottom: `1px solid rgba(184,139,82,0.12)`,
    }}
  >
    <span
      style={{
        fontSize: 30,
        fontWeight: 600,
        color: "rgba(184,139,82,0.25)",
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
        borderBottom: `1px solid rgba(184,139,82,0.12)`,
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
          border-radius: 2px;
          overflow: hidden;
          border: 1px solid rgba(184,139,82,0.22);
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
        <section style={{ background: C.bg, padding: "clamp(96px, 12vw, 120px) 24px 56px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <p style={MK.eyebrow}>Resources</p>
            <h1 style={MK.h1}>
              Free tools and thinking
              <br />
              <span style={MK.accent}>for SA business owners.</span>
            </h1>
            <p style={{ ...MK.lead, maxWidth: 560 }}>
              Everything here is free. No sign-up walls. No upsells. Just tools and articles built
              to help service businesses in South Africa make better decisions.
            </p>
          </div>
        </section>

        {/* ── FREE TOOLS ───────────────────────────────────────────── */}
        <section style={{ padding: SECTION.desktop }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <p style={MK.eyebrow}>
                Free Tools
              </p>
              <h2 style={MK.h2}>
                Built to solve <span style={MK.accent}>real challenges.</span>
              </h2>
            </div>

            <div className="resources-tools-grid">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 12,
                    background: C.s1,
                    border: `1px solid rgba(184,139,82,0.20)`,
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
                      background: "radial-gradient(circle, rgba(184,139,82,0.10) 0%, transparent 70%)",
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
                          background: "rgba(184,139,82,0.08)",
                          border: "1px solid rgba(184,139,82,0.18)",
                          borderRadius: 12,
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
                        background: "rgba(184,139,82,0.10)",
                        border: "1px solid rgba(184,139,82,0.35)",
                        borderRadius: 12,
                        padding: "10px 18px",
                        textDecoration: "none",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = "rgba(184,139,82,0.18)";
                        el.style.borderColor = "rgba(184,139,82,0.55)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = "rgba(184,139,82,0.10)";
                        el.style.borderColor = "rgba(184,139,82,0.35)";
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

        {/* ── ARTICLES ─────────────────────────────────────────────── */}
        <section style={{ background: C.s1, padding: SECTION.desktop, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
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
                <p style={MK.eyebrow}>
                  Articles
                </p>
                <h2 style={MK.h2}>
                  For business owners who <span style={MK.accent}>think ahead.</span>
                </h2>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: FONT_BODY,
                      cursor: "pointer",
                      border: `1px solid ${
                        activeCategory === cat
                          ? "rgba(184,139,82,0.60)"
                          : "rgba(184,139,82,0.20)"
                      }`,
                      background:
                        activeCategory === cat
                          ? "rgba(184,139,82,0.14)"
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
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,139,82,0.50)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,139,82,0.22)";
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
                      borderRadius: 12,
                      overflow: "hidden",
                      border: `1px solid rgba(184,139,82,0.18)`,
                      background: C.s2,
                      textDecoration: "none",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,139,82,0.45)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,139,82,0.18)";
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


        {/* ── FOUNDER STORY ────────────────────────────────────────── */}
        <section className="resources-founder-story" aria-label="The story behind NextSlot">
          <div className="resources-story-inner">
            <article className="resources-story-block resources-story-idea">
              <p className="resources-story-eyebrow">The Idea Behind NextSlot</p>
              <h2>I didn't want to build <span style={MK.accent}>just another booking app.</span></h2>
              <p>
                I've always been interested in one simple question: why does something have to be
                done a certain way?
              </p>
              <p>
                Independent service providers have spent years developing their craft. Running a
                business adds another layer of responsibility: managing bookings, payments, client
                relationships and the many decisions that come with keeping everything moving.
              </p>
              <p>
                I wanted to bring those moving parts together, giving business owners a clearer
                picture of what's happening in their businesses.
              </p>
              <blockquote className="resources-story-quote resources-story-vision">
                <p><strong>However, I believed there was an opportunity to go further.</strong></p>
              </blockquote>
              <p>
                A booking app can manage appointments. A dashboard can show you the numbers. I wanted
                to explore what becomes possible when that information starts telling a more useful
                story.
              </p>
              <p>
                That's where Nexty comes in. Nexty is NextSlot's growth advisor, designed to help
                business owners recognise patterns, identify potential opportunities and understand
                where they could improve. From spotting quieter periods to understanding client
                behaviour, the aim is to turn business activity into insights that can inform what
                happens next.
              </p>
              <blockquote className="resources-story-quote resources-story-founder-quote">
                <p>Knowing what happened is valuable. Understanding what you could do with that knowledge is where new possibilities begin.</p>
              </blockquote>
              <p>
                NextSlot is built around a simple belief: technology should give you more control
                over your business, helping you spend less energy piecing together your operations
                and more time making informed decisions about what comes next.
              </p>
            </article>

            <article className="resources-story-block resources-story-founder">
              <p className="resources-story-eyebrow">The Founder</p>
              <div className="resources-founder-profile">
                <img
                  className="resources-founder-photo"
                  src="https://iili.io/C9Ktrhu.jpg"
                  alt="Arshad Segal, Founder of NextSlot"
                  width={72}
                  height={72}
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <h3 className="resources-founder-name">Arshad Segal</h3>
                  <p className="resources-founder-role">Founder of NextSlot</p>
                </div>
              </div>
              <p>
                I'm drawn to ideas that connect creativity, technology and human behaviour. I
                question why things work the way they do, look for the systems behind everyday
                challenges, and believe useful ideas should lead to practical action.
              </p>
              <p>
                That thinking also shapes my personal project, Just Start: a space for creativity,
                entrepreneurship and the courage to begin.
              </p>
              <a
                className="resources-just-start-card"
                href="https://www.tiktok.com/@chasing_dweams?_r=1&_t=ZS-94gSp7To9iS"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="resources-just-start-glow" aria-hidden="true" />
                <span className="resources-just-start-copy">
                  <span className="resources-story-eyebrow">Personal brand / TikTok</span>
                  <span className="resources-just-start-title">Just Start.</span>
                  <span className="resources-just-start-description">
                    Creativity, entrepreneurship, and the courage to begin. Follow the journey on
                    TikTok.
                  </span>
                  <span className="resources-just-start-handle">@chasing_dweams</span>
                </span>
                <span className="resources-tiktok-link">
                  <img src={tiktokIcon} alt="TikTok" width={26} height={26} loading="lazy" decoding="async" />
                  Watch on TikTok
                </span>
              </a>
            </article>
          </div>
        </section>

        {/* ── CTA BANNER ───────────────────────────────────────────── */}
        <section style={{ padding: SECTION.desktop }}>
          <div style={{ ...MK.panel, maxWidth: 760, margin: "0 auto", padding: "clamp(32px, 6vw, 56px) clamp(24px, 5vw, 48px)" }}>
            <p style={MK.eyebrow}>Ready to start?</p>
            <h2 style={MK.h2}>Your booking page is 10 minutes away.</h2>
            <p style={{ ...MK.body, maxWidth: 480, margin: "0 auto 32px" }}>
              No payment required. No technical setup. Just your services, your availability,
              and your booking link ready to share.
            </p>
            <PrimaryCTA to="/onboarding">Create Your Booking Page</PrimaryCTA>
          </div>
        </section>

        <SiteFooter />
      </main>
    </MarketingLayout>
  );
};

export default Resources;
