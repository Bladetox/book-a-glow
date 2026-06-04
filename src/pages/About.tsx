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
    image: "https://miro.medium.com/v2/resize:fit:1200/1*Tg_mBQFBKQ0A8opnBFcZdQ@2x.jpeg",
  },
  {
    title: "How to Price Your Services Without Underselling or Losing Clients",
    excerpt:
      "Pricing is one of the most avoided conversations in small business. Most owners either charge too little out of fear or copy competitors without understanding their own costs. This is a practical method for getting it right.",
    category: "Finance",
    readTime: "6 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/how-to-price-your-services-without-underselling-or-losing-clients-3ef83cec7a94",
    image: "https://miro.medium.com/v2/resize:fit:1200/1*wJf3EJmtG0L9qT_RFrklTw@2x.jpeg",
  },
  {
    title: "The No-Show Problem: Why Deposits Are Not Just About the Money",
    excerpt:
      "No-shows cost service businesses more than just revenue. They disrupt your schedule, demoralise your team, and make planning impossible. A deposit policy is not about being difficult. It is about being taken seriously.",
    category: "Operations",
    readTime: "4 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/the-no-show-problem-why-deposits-are-not-just-about-the-money-6ba965fda4ef",
    image: "https://miro.medium.com/v2/resize:fit:1200/1*RYlCvqUTMqWGM77ynEoI4w@2x.jpeg",
  },
];

/* ─── how-it-works steps ─────────────────────────────────────── */
const steps = [
  {
    number: "01",
    title: "You set up your page",
    desc: "Add your services, set your hours, and choose your deposit rules. Takes about ten minutes.",
  },
  {
    number: "02",
    title: "Clients book themselves",
    desc: "Share your booking link anywhere. Clients pick a time, pay the deposit, and get a confirmation.",
  },
  {
    number: "03",
    title: "You show up and work",
    desc: "Your schedule is managed. No calls, no back-and-forth. Just confirmed bookings waiting for you.",
  },
];

/* ─── timeline ───────────────────────────────────────────────── */
const timeline = [
  {
    version: "The problem",
    date: "Early 2024",
    desc: "A barber in Cape Town was losing hours every week to WhatsApp scheduling. Missed messages. Double bookings. No-shows with no deposit. The tools available were either too complex or built for large salons.",
  },
  {
    version: "The shift",
    date: "Mid 2024",
    desc: "We started building something different. A booking system designed specifically for independent service providers. Simple to set up, serious enough to protect your time and income.",
  },
  {
    version: "NextSlot",
    date: "2025",
    desc: "NextSlot launched with a focus on South African service businesses. Barbers, nail technicians, photographers, tattoo artists. People who are skilled at what they do and should not have to be skilled at managing bookings too.",
  },
];

/* ─── feature cards ──────────────────────────────────────────── */
const features = [
  {
    label: "Booking page",
    desc: "A clean, mobile-first page your clients can use without an app or account.",
    color: "hsl(var(--foreground))",
  },
  {
    label: "Deposit collection",
    desc: "Require payment upfront so no-shows cost the client, not you.",
    color: GOLD,
  },
  {
    label: "Smart scheduling",
    desc: "Set your hours, block dates, and let the system handle availability.",
    color: "hsl(var(--foreground))",
  },
  {
    label: "Dashboard insights",
    desc: "See revenue, retention, and open slots at a glance. Know your numbers.",
    color: GOLD,
  },
  {
    label: "Automated reminders",
    desc: "Clients get notified before their appointment. Fewer forgotten bookings.",
    color: "hsl(var(--foreground))",
  },
  {
    label: "Built for South Africa",
    desc: "Rand pricing, local payment rails, and support that understands your context.",
    color: GOLD,
  },
];

/* ─── component ──────────────────────────────────────────────── */
const About = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const categories: Category[] = ["All", "Business", "Operations", "Finance"];

  const filtered =
    activeCategory === "All"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const featured = articles.find((a) => a.featured);
  const rest = filtered.filter((a) => !a.featured || activeCategory !== "All");

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main>

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
                About NextSlot
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
                Built for people who work with their hands
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                NextSlot is a booking and business management platform for independent service providers in South Africa.
                We handle the scheduling so you can focus on the work.
              </p>
            </div>
          </div>
        </section>

        {/* ── FEATURES IMAGE + GRID ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] group">
              <img
                src={FEATURES_IMAGE}
                alt="A professional at work in their studio"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="rounded-2xl border border-border bg-secondary/40 p-5 space-y-2"
                >
                  <p className="text-sm font-semibold" style={{ color: f.color }}>
                    {f.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="border-t border-border bg-secondary/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="mb-12">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
                How it works
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Set up once. Run on autopilot.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((s) => (
                <div key={s.number} className="space-y-4">
                  <span
                    className="text-5xl font-bold tabular-nums"
                    style={{ color: GOLD, opacity: 0.6 }}
                  >
                    {s.number}
                  </span>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STORY / TIMELINE ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
                Our story
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                Where NextSlot came from
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Every feature in NextSlot exists because a real service provider needed it.
                We did not build this from a boardroom. We built it from conversations with
                barbers, nail technicians, photographers, and tattoo artists who were drowning
                in admin.
              </p>
            </div>
            <div className="space-y-8">
              {timeline.map((t, i) => (
                <div key={t.version} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: GOLD }}
                    />
                    {i < timeline.length - 1 && (
                      <div className="w-px flex-1 mt-2 bg-border" />
                    )}
                  </div>
                  <div className="pb-8 last:pb-0">
                    <p className="text-xs text-muted-foreground mb-1">{t.date}</p>
                    <p className="font-semibold mb-2">{t.version}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CASE STUDY ── */}
        <section id="case-study" className="border-t border-border bg-secondary/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="mb-10">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
                In practice
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Real businesses. Real results.
              </h2>
            </div>

            {/* Just Start TikTok brand card */}
            <div
              className="relative rounded-3xl overflow-hidden p-8 md:p-12"
              style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
              }}
            >
              <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-medium text-white/80 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4A574]" />
                    Cape Town, South Africa
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    Just Start TikTok
                  </h3>
                  <p className="text-white/70 leading-relaxed mb-6">
                    A Cape Town-based content creation and social media coaching brand that
                    helps entrepreneurs build their presence on TikTok. They use NextSlot
                    to manage one-on-one coaching sessions, content audits, and strategy calls.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {[
                      { label: "No-show rate", value: "Near zero", sub: "since adding deposits" },
                      { label: "Booking time", value: "2 min", sub: "average client booking" },
                      { label: "Admin saved", value: "5+ hrs", sub: "per week" },
                      { label: "Setup time", value: "10 min", sub: "to go live" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl bg-white/8 border border-white/10 p-4"
                      >
                        <p className="text-xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-white/50 mt-0.5">{stat.sub}</p>
                        <p className="text-xs text-white/40 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <a
                    href="https://www.tiktok.com/@juststarttiktok"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    Follow on TikTok
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white/8 border border-white/10 p-6">
                    <p className="text-white/80 text-sm leading-relaxed italic mb-4">
                      "Before NextSlot, I was spending hours every week just managing DMs and trying to
                      coordinate bookings. Now clients book themselves, pay their deposit, and I get a
                      notification. It changed how I run my business."
                    </p>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: "linear-gradient(135deg, #D4A574, #B8915F)" }}
                      >
                        JS
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Just Start TikTok</p>
                        <p className="text-xs text-white/50">Content Coach, Cape Town</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/8 border border-white/10 p-5">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Services offered</p>
                    <div className="flex flex-wrap gap-2">
                      {["TikTok Strategy", "Content Audit", "1:1 Coaching", "Brand Review", "Profile Optimisation"].map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70 border border-white/10"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BLOG ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
                Resources
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                For independent business owners
              </h2>
            </div>
            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Featured article */}
          {activeCategory === "All" && featured && (
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-3xl overflow-hidden border border-border bg-secondary/40 hover:border-foreground/20 transition-colors mb-6"
            >
              <div className="grid md:grid-cols-2">
                {featured.image && (
                  <div className="aspect-video md:aspect-auto overflow-hidden">
                    <img
                      src={featured.image}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-8 md:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-foreground/10 text-foreground">
                      {featured.category}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {featured.readTime} read
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-muted-foreground transition-colors leading-snug">
                    {featured.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {featured.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    Read on Medium
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </a>
          )}

          {/* Article grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rest.map((article) => (
              <a
                key={article.title}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-secondary/40 hover:border-foreground/20 transition-colors"
              >
                {article.image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-foreground/8 text-foreground/70">
                      {article.category}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug mb-2 group-hover:text-muted-foreground transition-colors flex-1">
                    {article.title}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-3">
                    Read
                    <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </div>
              </a>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No articles in this category yet.
            </p>
          )}
        </section>

        {/* ── AUTHOR ── */}
        <section className="border-t border-border bg-secondary/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex flex-col sm:flex-row items-start gap-6 max-w-2xl">
              <div
                className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${GOLD}, hsl(38 50% 40%))` }}
              >
                AS
              </div>
              <div>
                <p className="font-semibold mb-1">Arshad Segal</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Founder of NextSlot. Writes about operations, finance, and growth for independent service businesses in South Africa.
                </p>
                <a
                  href="https://medium.com/@arshadsegal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-muted-foreground transition-colors"
                >
                  Read on Medium
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Stop managing bookings manually
            </h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Get your booking page live today. No monthly fees while you are getting started.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/onboarding"
                className="group inline-flex items-center justify-center bg-white text-black text-sm font-semibold px-7 py-3.5 rounded-[10px] hover:bg-white/90 transition-colors"
              >
                Create your booking page
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/pricing"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                View pricing
              </Link>
            </div>
          </div>

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </section>

        {/* ── VALUES ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="mb-12">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
              What we believe
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              How we think about this work
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Simplicity is a feature",
                desc: "Most booking software is built for large teams and takes days to configure. NextSlot is built for one person who has a business to run.",
              },
              {
                title: "Your time has value",
                desc: "Every hour spent on admin is an hour not spent on the work you are actually good at. We exist to give that time back.",
              },
              {
                title: "Local context matters",
                desc: "South African businesses operate differently. Load shedding, local payment methods, and the way clients communicate here shaped every decision we made.",
              },
            ].map((v) => (
              <div key={v.title} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                  <h3 className="font-semibold">{v.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
};

export default About;
