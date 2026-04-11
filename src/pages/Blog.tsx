import { useState } from "react";
import { ArrowRight, ArrowUpRight, Clock } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

/* ─── TYPES ─────────────────────────────────────────────────────── */
type Category = "All" | "Business" | "Operations" | "Finance";

type Article = {
  title: string;
  excerpt: string;
  category: Exclude<Category, "All">;
  readTime: string;
  date: string;
  url: string;
  featured?: boolean;
};

/* ─── ARTICLES ───────────────────────────────────────────────────
   Add new articles at the TOP of this array.
   Set featured: true on the one you want to hero.
──────────────────────────────────────────────────────────────── */
const articles: Article[] = [
  {
    title: "You Don't Own Your Marketplace Sales — And That's the Problem",
    excerpt:
      "Selling on Takealot, Etsy, or Amazon feels like growth. But when the platform changes its algorithm, raises its fees, or suspends your account, you have nothing. Here is what business owners need to understand before it is too late.",
    category: "Business",
    readTime: "5 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/you-dont-own-your-marketplace-sales-and-that-s-the-problem-efcc7da7b47a",
    featured: true,
  },
  {
    title: "Sole Proprietor vs Pty Ltd in South Africa: Which One Fits Your Next 5 Years?",
    excerpt:
      "The structure you start with is rarely the one that serves you later. This is a clear breakdown of what each option actually means for your taxes, liability, and ability to grow — without the legal jargon.",
    category: "Finance",
    readTime: "6 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/sole-proprietor-vs-pty-ltd-in-south-africa-which-one-fits-your-next-5-years-f5e10847ccc9",
  },
  {
    title: "Why Your SSME Needs a Delivery Strategy, Not a Delivery Hope",
    excerpt:
      "Most small service businesses deliver inconsistently — not because they lack skill, but because they have no system. The difference between a one-person operation and a scalable business is almost always a delivery process.",
    category: "Operations",
    readTime: "5 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/why-your-ssme-needs-a-delivery-strategy-not-a-delivery-hope-0acf3cfb99ea",
  },
  {
    title: "Why South African SMEs Need to Act Now on Digital Payments (2025–2026)",
    excerpt:
      "The window to get ahead of digital payments in South Africa is narrowing. Customers expect it, competitors are adopting it, and the cost of staying cash-only is compounding. Here is what the data says — and what to do about it.",
    category: "Finance",
    readTime: "5 min",
    date: "2025",
    url: "https://medium.com/@arshadsegal/why-south-african-smes-need-to-act-now-on-digital-payments-2025-2026-0a68b755ec79",
  },
];

const categories: Category[] = ["All", "Business", "Operations", "Finance"];

/* ─── PAGE ──────────────────────────────────────────────────────── */
const Blog = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const featured = articles.find((a) => a.featured);
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
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "hsl(var(--accent))" }}
            >
              The NextSlot Blog
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-[1.1] max-w-2xl">
              Practical thinking for South African service businesses.
            </h1>
            <p className="text-base leading-relaxed max-w-xl" style={{ color: "hsl(var(--muted-foreground))" }}>
              Business structure, operations, payments, and growth — written by Arshad Segal, founder of NextSlot.
            </p>
          </div>
        </section>

        {/* Accent rule */}
        <div
          className="h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent)/0.4), transparent)" }}
        />

        {/* ── FILTER BAR ───────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 flex-wrap">
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
        </section>

        {/* ── FEATURED CARD ────────────────────────────────────── */}
        {featured && showFeatured && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative overflow-hidden rounded-3xl transition-all duration-300"
              style={{
                background: "var(--gradient-card)",
                border: "1px solid hsl(var(--accent) / 0.40)",
                boxShadow: "0 0 0 1px hsl(var(--accent)/0.08), inset 0 1px 0 hsl(var(--accent)/0.12), var(--shadow-elevated)",
              }}
            >
              {/* Cover band */}
              <div
                className="h-44 md:h-56 w-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent)/0.18) 0%, hsl(var(--secondary)) 100%)",
                  borderBottom: "1px solid hsl(var(--accent)/0.15)",
                }}
              >
                <span
                  className="text-5xl md:text-7xl font-semibold tracking-tighter select-none"
                  style={{ color: "hsl(var(--accent)/0.20)" }}
                >
                  Featured
                </span>
              </div>

              {/* Content */}
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <CategoryChip category={featured.category} />
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    <Clock className="h-3 w-3" />{featured.readTime} read
                  </span>
                  <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {featured.date}
                  </span>
                </div>
                <h2
                  className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 leading-snug"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {featured.title}
                </h2>
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
                  Read on Medium <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </a>
          </section>
        )}

        {/* ── ARTICLE GRID ─────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
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
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.55)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-glow), var(--shadow-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.22)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-soft)";
                  }}
                >
                  {/* Cover */}
                  <div
                    className="h-32 w-full shrink-0 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--accent)/0.12) 0%, hsl(var(--secondary)) 100%)",
                      borderBottom: "1px solid hsl(var(--accent)/0.12)",
                    }}
                  >
                    <span
                      className="text-3xl font-semibold tracking-tighter select-none"
                      style={{ color: "hsl(var(--accent)/0.28)" }}
                    >
                      NS
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryChip category={article.category} small />
                      <span
                        className="text-[11px] flex items-center gap-1"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        <Clock className="h-3 w-3" />{article.readTime}
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
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                No articles in this category yet.
              </p>
            </div>
          )}
        </section>

        {/* ── AUTHOR STRIP ────────────────────────────────────────── */}
        <section
          style={{
            borderTop: "1px solid hsl(var(--border))",
            background: "var(--gradient-section)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            <div className="max-w-xl mx-auto text-center space-y-4">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--accent))" }}
              >
                Written by
              </p>
              <h2 className="text-xl font-semibold tracking-tight">Arshad Segal</h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Founder of NextSlot. Writing about what actually works for independent service businesses in South Africa —
                structure, systems, payments, and the decisions that compound over time.
              </p>
              <a
                href="https://medium.com/@arshadsegal"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 text-sm font-medium px-6 py-3 rounded-[10px] transition-all duration-200"
                style={{
                  border: "1px solid hsl(var(--accent)/0.45)",
                  color: "hsl(var(--foreground))",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary))";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.7)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.45)";
                }}
              >
                Follow on Medium
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
};

/* ─── CATEGORY CHIP ─────────────────────────────────────────────
   Three tiers of accent opacity = visually distinct, still on-brand.
   Business: 80% (boldest), Operations: 55%, Finance: 35% (softest).
──────────────────────────────────────────────────────────────── */
const categoryOpacity: Record<Exclude<Category, "All">, string> = {
  Business:   "0.80",
  Operations: "0.55",
  Finance:    "0.35",
};

const CategoryChip = ({
  category,
  small = false,
}: {
  category: Exclude<Category, "All">;
  small?: boolean;
}) => (
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

export default Blog;
