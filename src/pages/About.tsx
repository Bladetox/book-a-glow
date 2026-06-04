import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Clock, Check } from "lucide-react";
import { useState } from "react";

/* ─── constants ─────────────────────────────────────────────── */
const GOLD    = "hsl(38 40% 58%)";
const FEATURES_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=80";

/* ─── blog data ─────────────────────────────────────────────── */
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

/* ─── case study data ───────────────────────────────────────── */
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

/* ─── sub-components ────────────────────────────────────────── */
const categoryOpacity: Record<Exclude<Category, "All">, string> = {
  Business:   "0.80",
  Operations: "0.55",
  Finance:    "0.35",
};

const CategoryChip = ({ category, small = false }: { category: Exclude<Category, "All">; small?: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full font-semibold border ${
      small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]"
    }`}
    style={{
      background: `hsl(var(--accent) / ${categoryOpacity[category]})`,
      color: "hsl(var(--foreground))",
      borderColor: "hsl(var(--accent) / 0.30)",
    }}
  >
    {category}
  </span>
);

const FallbackBand = ({ tall = false }: { tall?: boolean }) => (
  <div
    className={`w-full shrink-0 flex items-center justify-center ${
      tall ? "h-44 md:h-56" : "h-32"
    }`}
    style={{
      background:
        "linear-gradient(135deg, hsl(var(--accent)/0.18) 0%, hsl(var(--secondary)) 100%)",
      borderBottom: "1px solid hsl(var(--accent)/0.12)",
    }}
  >
    <span
      className="text-3xl font-semibold tracking-tighter select-none"
      style={{ color: "hsl(var(--accent)/0.25)" }}
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
      className={`w-full shrink-0 overflow-hidden ${
        tall ? "h-44 md:h-56" : "h-32"
      }`}
      style={{ borderBottom: "1px solid hsl(var(--accent)/0.12)" }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        onError={(e) => {
          (e.currentTarget.parentElement as HTMLElement).innerHTML = "";
        }}
      />
    </div>
  );
};

/* ─── page ───────────────────────────────────────────────────── */
const About = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const featured  = articles.find((a) => a.featured);
  const isFiltered = activeCategory !== "All";
  const showFeatured = !isFiltered || featured?.category === activeCategory;
  const grid = articles
    .filter((a) => !a.featured)
    .filter((a) => !isFiltered || a.category === activeCategory);

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "var(--gradient-glow)" }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px hidden lg:block"
            style={{
              background:
                "linear-gradient(180deg, transparent, hsl(var(--accent)/0.18), transparent)",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 md:pt-24 md:pb-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

              {/* LEFT */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <img
                    src="/web-app-manifest-192x192.png"
                    alt="NextSlot"
                    width={44}
                    height={44}
                    loading="lazy"
                    decoding="async"
                    className="h-11 w-11 rounded-xl object-contain"
                    style={{ boxShadow: "var(--shadow-soft)" }}
                  />
                  <p
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    About NextSlot
                  </p>
                </div>
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-6">
                  Built from real problems.
                  <br />
                  <span style={{ color: "hsl(var(--accent))" }}>Not a boardroom.</span>
                </h1>
                <p
                  className="text-base leading-relaxed max-w-md mb-8"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  NextSlot is a booking and business intelligence platform built for South African
                  service businesses. Designed with the reality of this market in mind, not a generic
                  global template.
                </p>
                <Link
                  to="/onboarding"
                  className="group inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-[10px] transition-all duration-200"
                  style={{
                    background: "hsl(var(--foreground))",
                    color: "hsl(var(--background))",
                    boxShadow: "var(--shadow-elevated)",
                  }}
                >
                  Create Your Booking Page
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* RIGHT: signature quote card */}
              <div
                className="rounded-2xl p-8 md:p-10 relative overflow-hidden"
                style={{
                  background: "var(--gradient-card)",
                  border: "1px solid hsl(var(--accent)/0.30)",
                  boxShadow: "var(--shadow-elevated)",
                }}
              >
                <div
                  className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, hsl(var(--accent)/0.12) 0%, transparent 70%)",
                  }}
                />
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-6"
                  style={{ color: "hsl(var(--accent))" }}
                >
                  The Founder's Belief
                </p>
                <blockquote className="space-y-4 relative">
                  <p className="text-xl md:text-2xl font-semibold tracking-tight leading-snug">
                    "Sometimes the biggest barrier to progress is waiting too long to start."
                  </p>
                  <footer
                    className="text-sm"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    Arshad Segal, Founder of NextSlot
                  </footer>
                </blockquote>
                <div
                  className="mt-8 pt-6"
                  style={{ borderTop: "1px solid hsl(var(--accent)/0.20)" }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Booking types", value: "Any service" },
                      { label: "Built for",     value: "South Africa" },
                      { label: "Setup time",    value: "20 min" },
                      { label: "Trial",         value: "30 days free" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p
                          className="text-[11px] uppercase tracking-widest mb-0.5"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          {item.label}
                        </p>
                        <p className="text-sm font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--accent)/0.4), transparent)",
          }}
        />

        {/* ── ORIGIN ───────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="prose-section space-y-5">
            <p className="text-base text-foreground/80 leading-relaxed">
              In South Africa, service businesses operate in one of the most competitive and
              price-sensitive environments in the world. Barbers, beauty studios, nail technicians,
              tattoo artists, massage therapists and independent creatives work long hours, build loyal
              communities, and carry the pressure of keeping their businesses running day after day.
              Yet the tools available to them often feel disconnected from how their businesses
              actually work.
            </p>
            <p className="text-base text-foreground/80 leading-relaxed">
              NextSlot was created to change that.
            </p>
          </div>
        </section>

        {/* ── THE IDEA ─────────────────────────────────────────── */}
        <section className="bg-secondary/40 py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              The Idea Behind NextSlot
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Technology that feels like part of your business.
            </h2>
            <p className="text-base text-foreground/80 leading-relaxed">
              NextSlot is a platform designed to help service-based businesses manage bookings,
              understand their data, and make smarter decisions. But the goal goes beyond software.
            </p>
            <blockquote className="border-l-2 border-accent pl-5 space-y-1">
              <p className="text-base font-semibold text-foreground">The vision is simple.</p>
              <p className="text-base text-muted-foreground italic">
                Technology should feel like part of your business, not something imposed on it.
              </p>
            </blockquote>
            <p className="text-base text-foreground/80 leading-relaxed">
              Instead of complicated dashboards, generic automation, and advice that ignores
              real-world conditions, NextSlot focuses on context. It looks at what is actually
              happening inside your business and turns that information into practical insights you
              can use.
            </p>
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium text-foreground">Not guru advice.</p>
              <p className="text-sm font-medium text-foreground">Not guesswork.</p>
              <p className="text-sm font-medium text-foreground">
                Real insights based on your business' real data.
              </p>
            </div>
            <p className="text-base text-foreground/80 leading-relaxed">
              In a market like South Africa, where raising prices, losing clients, or making the
              wrong decision can have real consequences, businesses need tools that are street smart
              as well as professional. NextSlot was designed with that reality in mind.
            </p>
          </div>
        </section>

        {/* ── BUILT FOR CREATIVES ──────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            A Platform Built for Creatives
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Relationships matter. Community matters. Reputation matters.
          </h2>
          <p className="text-base text-foreground/80 leading-relaxed">
            Creative service businesses are deeply human. NextSlot respects that.
          </p>
          <p className="text-base text-foreground/80 leading-relaxed">
            The platform is designed to feel familiar and supportive rather than cold or overly
            technical. It fits naturally into the way creative professionals already run their
            businesses, helping them stay organised, understand their growth, and serve their clients
            better.
          </p>
          <blockquote className="border-l-2 border-accent pl-5">
            <p className="text-base text-muted-foreground italic">
              It is technology that works quietly in the background while the real craft stays front
              and center.
            </p>
          </blockquote>
        </section>

        {/* ── FOUNDER ─────────────────────────────────────────── */}
        <section className="bg-secondary/40 py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              The Founder
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Arshad Segal</h2>
            <p className="text-base text-foreground/80 leading-relaxed">
              NextSlot was founded by Arshad Segal, an entrepreneur and builder driven by a simple
              belief.
            </p>
            <blockquote className="border-l-2 border-accent pl-5">
              <p className="text-base font-semibold text-foreground italic">
                Sometimes the biggest barrier to progress is waiting too long to start.
              </p>
            </blockquote>
            <p className="text-base text-foreground/80 leading-relaxed">
              Arshad has always been drawn to ideas that combine creativity, technology, and human
              behaviour. His work often sits at the intersection of entrepreneurship, storytelling,
              and systems thinking. He believes that when people are given the right tools and a
              clear path forward, they can build extraordinary things from ordinary beginnings.
            </p>
            <p className="text-base text-foreground/80 leading-relaxed">
              This philosophy is reflected in his broader creative work and personal brand, centred
              on one belief he returns to constantly:
            </p>

            {/* Just Start card */}
            <a
              href="https://www.tiktok.com/@chasing_dweams?_r=1&_t=ZS-94gSp7To9iS"
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative overflow-hidden rounded-2xl transition-all duration-300 no-underline"
              style={{
                background: "var(--gradient-card)",
                border: `1px solid ${GOLD}44`,
                boxShadow: `0 0 0 1px ${GOLD}18, var(--shadow-soft)`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = `${GOLD}88`;
                el.style.boxShadow = `0 0 28px 0 ${GOLD}22, var(--shadow-elevated)`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = `${GOLD}44`;
                el.style.boxShadow = `0 0 0 1px ${GOLD}18, var(--shadow-soft)`;
              }}
            >
              <div
                className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`,
                }}
              />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-7 md:p-8">
                <div className="space-y-2">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: GOLD }}
                  >
                    Personal brand / TikTok
                  </p>
                  <p className="text-3xl md:text-4xl font-semibold tracking-tight leading-none">
                    Just Start.
                  </p>
                  <p
                    className="text-sm leading-relaxed max-w-xs"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    Creativity, entrepreneurship, and the courage to begin. Follow the journey on
                    TikTok.
                  </p>
                  <p
                    className="text-xs font-medium"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    @chasing_dweams
                  </p>
                </div>
                <div className="shrink-0">
                  <span
                    className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-[10px] transition-all duration-200 group-hover:gap-3"
                    style={{
                      background: `${GOLD}18`,
                      border: `1px solid ${GOLD}55`,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    Watch on TikTok
                    <ArrowUpRight className="h-4 w-4" style={{ color: GOLD }} />
                  </span>
                </div>
              </div>
            </a>

            <p className="text-base text-foreground/80 leading-relaxed">
              NextSlot is a practical extension of that mindset, a tool created to help everyday
              business owners take the next step, make better decisions, and grow with confidence.
            </p>
          </div>
        </section>

        {/* ── MISSION ─────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Our Mission
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug">
            To give service businesses tools that feel like they were built by someone who actually
            understands their world.
          </h2>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Not overly complex.</p>
            <p className="text-sm font-medium text-foreground">Not disconnected from reality.</p>
            <p className="text-sm font-medium text-foreground">
              Just useful, thoughtful technology that helps businesses move forward.
            </p>
          </div>
          <p className="text-base text-foreground/80 leading-relaxed">
            Because behind every booking, every client, and every small studio is a person working
            hard to build something meaningful. NextSlot exists to support that journey.
          </p>
        </section>

        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--accent)/0.4), transparent)",
          }}
        />

        {/* ── CASE STUDY ───────────────────────────────────────── */}
        <section id="case-study" className="relative w-full min-h-[360px] flex items-end overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={FEATURES_IMAGE}
              alt="PhenomeBeauty"
              fetchPriority="low"
              decoding="async"
              loading="lazy"
              className="w-full h-full object-cover object-center"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, hsl(var(--background)/0.30) 0%, hsl(var(--background)/0.92) 80%, hsl(var(--background)) 100%)",
              }}
            />
          </div>
          <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-14 pt-32">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: GOLD }}
            >
              Where NextSlot came from
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold leading-tight tracking-tight mb-4">
              It all started with PhenomeBeauty.
            </h2>
            <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
              A mobile beauty studio owner doing everything alone. Bookings on WhatsApp, deposits
              via EFT, schedules in her head. This is her journey and the reason NextSlot exists.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Solo operator",
                "Mobile business",
                "No staff",
                "WhatsApp bookings",
                "Proof of payment chaos",
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    background: "hsl(38 40% 58% / 0.10)",
                    border: "1px solid hsl(38 40% 58% / 0.30)",
                    color: GOLD,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Pull quote */}
        <section className="py-12 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <blockquote
              className="rounded-2xl px-8 py-7"
              style={{
                background: "hsl(38 40% 58% / 0.07)",
                border: "1.5px solid hsl(38 40% 58% / 0.40)",
                boxShadow: "0 4px 24px hsl(38 40% 58% / 0.10)",
              }}
            >
              <p className="text-lg sm:text-xl font-medium leading-relaxed mb-3">
                "For the first time, the business felt like it was running itself."
              </p>
              <footer className="text-sm" style={{ color: GOLD }}>
                PhenomeBeauty, NextSlot customer
              </footer>
            </blockquote>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-10 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {timeline.map((card) => (
              <div
                key={card.step}
                className="relative rounded-2xl p-6 sm:p-8"
                style={
                  card.isFinal
                    ? {
                        background: "hsl(38 40% 58% / 0.07)",
                        border: "1.5px solid hsl(38 40% 58% / 0.65)",
                        boxShadow: "0 4px 24px hsl(38 40% 58% / 0.15)",
                      }
                    : {
                        background: "hsl(var(--secondary) / 0.40)",
                        border: "1px solid hsl(var(--border))",
                      }
                }
              >
                <span
                  aria-hidden="true"
                  className="absolute right-5 bottom-4 text-[5rem] font-black leading-none pointer-events-none select-none"
                  style={{
                    color: card.isFinal
                      ? "hsl(38 40% 58% / 0.12)"
                      : "hsl(var(--foreground)/0.04)",
                  }}
                >
                  {card.step}
                </span>
                <div className="flex items-center justify-between gap-3 mb-5 relative z-10">
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-0.5"
                      style={{
                        color: card.isFinal ? GOLD : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {card.label}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                      {card.version}
                    </p>
                  </div>
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={
                      card.isFinal
                        ? { background: GOLD, color: "hsl(var(--background))" }
                        : {
                            background: "hsl(var(--secondary))",
                            color: "hsl(var(--muted-foreground))",
                          }
                    }
                  >
                    {parseInt(card.step)}
                  </span>
                </div>
                <ul className="relative z-10 space-y-2.5">
                  {card.points.map((pt, pi) => (
                    <li key={pi} className="flex items-start gap-2.5">
                      {card.isFinal ? (
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          style={{ color: GOLD }}
                        />
                      ) : (
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 bg-muted-foreground/40" />
                      )}
                      <span
                        className={`text-sm leading-relaxed ${
                          card.isFinal ? "font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {pt}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--accent)/0.4), transparent)",
          }}
        />

        {/* ── BLOG ────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden py-16 md:py-20"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "var(--gradient-glow)" }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: "hsl(var(--accent))" }}
              >
                The NextSlot Blog
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.08] mb-4">
                Practical thinking for South African service businesses.
              </h2>
              <p
                className="text-base leading-relaxed max-w-md"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Business structure, operations, payments, and growth.
              </p>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
                  style={
                    activeCategory === cat
                      ? {
                          background: "hsl(var(--foreground))",
                          color: "hsl(var(--background))",
                          borderColor: "hsl(var(--foreground))",
                        }
                      : {
                          background: "transparent",
                          color: "hsl(var(--muted-foreground))",
                          borderColor: "hsl(var(--border))",
                        }
                  }
                >
                  {cat}
                </button>
              ))}
              <span
                className="ml-auto text-xs"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                {articles.length} articles
              </span>
            </div>

            {/* Featured full card */}
            {featured && showFeatured && (
              <div className="mb-8">
                <a
                  href={featured.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block relative overflow-hidden rounded-3xl transition-all duration-300"
                  style={{
                    background: "var(--gradient-card)",
                    border: "1px solid hsl(var(--accent)/0.40)",
                    boxShadow:
                      "0 0 0 1px hsl(var(--accent)/0.08), inset 0 1px 0 hsl(var(--accent)/0.12), var(--shadow-elevated)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "hsl(var(--accent)/0.65)";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "var(--shadow-glow), var(--shadow-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "hsl(var(--accent)/0.40)";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 0 0 1px hsl(var(--accent)/0.08), inset 0 1px 0 hsl(var(--accent)/0.12), var(--shadow-elevated)";
                  }}
                >
                  <CoverImage src={featured.image} alt={featured.title} tall />
                  <div className="p-8 md:p-10">
                    <div className="flex items-center gap-3 mb-4">
                      <CategoryChip category={featured.category} />
                      <span
                        className="text-xs flex items-center gap-1"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        <Clock className="h-3 w-3" />
                        {featured.readTime} read
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {featured.date}
                      </span>
                    </div>
                    <h3
                      className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 leading-snug"
                      style={{ color: "hsl(var(--foreground))" }}
                    >
                      {featured.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed max-w-2xl mb-6"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      {featured.excerpt}
                    </p>
                    <span
                      className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all duration-200"
                      style={{ color: "hsl(var(--accent))" }}
                    >
                      Read article <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </a>
              </div>
            )}

            {/* Article grid */}
            {grid.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {grid.map((article) => (
                  <a
                    key={article.title}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-300"
                    style={{
                      background: "var(--gradient-card)",
                      border: "1px solid hsl(var(--accent)/0.22)",
                      boxShadow: "var(--shadow-soft)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "hsl(var(--accent)/0.55)";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "var(--shadow-glow), var(--shadow-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "hsl(var(--accent)/0.22)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-soft)";
                    }}
                  >
                    <CoverImage src={article.image} alt={article.title} />
                    <div className="flex flex-col flex-1 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <CategoryChip category={article.category} small />
                        <span
                          className="text-[11px] flex items-center gap-1"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          <Clock className="h-3 w-3" />
                          {article.readTime}
                        </span>
                      </div>
                      <h3
                        className="text-base font-semibold leading-snug mb-2"
                        style={{ color: "hsl(var(--foreground))" }}
                      >
                        {article.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed flex-1"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {article.excerpt}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <span
                          className="text-xs"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          {article.date}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all duration-200"
                          style={{ color: "hsl(var(--accent))" }}
                        >
                          Read <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p
                  className="text-sm"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  No articles in this category yet.
                </p>
              </div>
            )}

            {/* Author strip */}
            <div
              className="mt-14 rounded-2xl px-8 py-10 text-center space-y-4"
              style={{
                background: "hsl(220 20% 8%)",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                Written by
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-white">Arshad Segal</h3>
              <p className="text-sm leading-relaxed text-white/55 max-w-md mx-auto">
                Founder of NextSlot. Writing about what actually works for independent service
                businesses in South Africa. Structure, systems, payments, and the decisions that
                compound over time.
              </p>
              <p className="text-xs text-white/35">
                More articles on{" "}
                <a
                  href="https://medium.com/@arshadsegal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white/60 transition-colors"
                >
                  medium.com/@arshadsegal
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ───────────────────────────────────────── */}
        <section
          style={{ background: "hsl(220 20% 8%)" }}
          className="py-16 md:py-20"
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              NextSlot
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Built for the people behind the chair, the studio, and the craft.
            </h2>
            <p className="text-sm text-white/55 leading-relaxed">
              Let your bookings run themselves. Try free for 30 days. No payment required.
            </p>
            <div className="flex flex-col items-center gap-3 pt-2">
              <Link
                to="/onboarding"
                className="group inline-flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 rounded-[10px] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.45)] hover:scale-[1.02]"
                style={{
                  background: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                }}
              >
                Create Your Booking Page
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white/45 hover:text-white/80 transition-colors"
              >
                Or try the live demo first
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
};

export default About;
