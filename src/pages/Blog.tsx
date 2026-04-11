import { useState } from "react";
import { ArrowRight, ArrowUpRight, Clock } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";

/* TYPE */
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
    image: "https://miro.medium.com/v2/resize:fit:1200/1*4y1EyPtlUmgZSJJcgiIEQ@2x.jpeg",
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

const FallbackBand = ({ tall = false }: { tall?: boolean }) => (
  <div
    className={`w-full shrink-0 flex items-center justify-center ${tall ? "h-44 md:h-56" : "h-32"}`}
    style={{
      background: "linear-gradient(135deg, hsl(var(--accent)/0.18) 0%, hsl(var(--secondary)) 100%)",
      borderBottom: "1px solid hsl(var(--accent)/0.12)",
    }}
  >
    <span className="text-3xl font-semibold tracking-tighter select-none" style={{ color: "hsl(var(--accent)/0.25)" }}>NS</span>
  </div>
);

const CoverImage = ({ src, alt, tall = false }: { src?: string; alt: string; tall?: boolean }) => {
  if (!src) return <FallbackBand tall={tall} />;
  return (
    <div className={`w-full shrink-0 overflow-hidden ${tall ? "h-44 md:h-56" : "h-32"}`}
      style={{ borderBottom: "1px solid hsl(var(--accent)/0.12)" }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        onError={(e) => { (e.currentTarget.parentElement as HTMLElement).innerHTML = ''; }}
      />
    </div>
  );
};

/* PAGE */
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

        {/* HERO */}
        <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 md:pt-24 md:pb-20">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

              {/* LEFT */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "hsl(var(--accent))" }}>The NextSlot Blog</p>
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-5">
                  Practical thinking for South African service businesses.
                </h1>
                <p className="text-base leading-relaxed max-w-md mb-8" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Business structure, operations, payments, and growth. Written by Arshad Segal, founder of NextSlot.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--accent))" }} />
                  {articles.length} articles published
                </span>
              </div>

              {/* RIGHT: featured article mini-card */}
              {featured && (
                <a
                  href={featured.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: "var(--gradient-card)",
                    border: "1px solid hsl(var(--accent)/0.35)",
                    boxShadow: "var(--shadow-elevated)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-glow), var(--shadow-elevated)";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.65)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-elevated)";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.35)";
                  }}
                >
                  <CoverImage src={featured.image} alt={featured.title} tall />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryChip category={featured.category} small />
                      <span className="text-[11px] flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                        <Clock className="h-3 w-3" />{featured.readTime} read
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold leading-snug mb-3" style={{ color: "hsl(var(--foreground))" }}>
                      {featured.title}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold group-hover:gap-2.5 transition-all duration-200" style={{ color: "hsl(var(--accent))" }}>
                      Read article <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent)/0.4), transparent)" }} />

        {/* FILTER BAR */}
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
                    ? { background: "hsl(var(--foreground))", color: "hsl(var(--background))", borderColor: "hsl(var(--foreground))" }
                    : { background: "transparent", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                }
              >
                {cat}
              </button>
            ))}
            <span className="ml-auto text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{articles.length} articles</span>
          </div>
        </section>

        {/* FEATURED FULL CARD */}
        {featured && showFeatured && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative overflow-hidden rounded-3xl transition-all duration-300"
              style={{
                background: "var(--gradient-card)",
                border: "1px solid hsl(var(--accent)/0.40)",
                boxShadow: "0 0 0 1px hsl(var(--accent)/0.08), inset 0 1px 0 hsl(var(--accent)/0.12), var(--shadow-elevated)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.65)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-glow), var(--shadow-elevated)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.40)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px hsl(var(--accent)/0.08), inset 0 1px 0 hsl(var(--accent)/0.12), var(--shadow-elevated)";
              }}
            >
              <CoverImage src={featured.image} alt={featured.title} tall />
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <CategoryChip category={featured.category} />
                  <span className="text-xs flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <Clock className="h-3 w-3" />{featured.readTime} read
                  </span>
                  <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{featured.date}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 leading-snug" style={{ color: "hsl(var(--foreground))" }}>
                  {featured.title}
                </h2>
                <p className="text-sm leading-relaxed max-w-2xl mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {featured.excerpt}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all duration-200" style={{ color: "hsl(var(--accent))" }}>
                  Read article <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </a>
          </section>
        )}

        {/* ARTICLE GRID */}
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
                  <CoverImage src={article.image} alt={article.title} />
                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryChip category={article.category} small />
                      <span className="text-[11px] flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                        <Clock className="h-3 w-3" />{article.readTime}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold leading-snug mb-2" style={{ color: "hsl(var(--foreground))" }}>
                      {article.title}
                    </h3>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {article.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{article.date}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all duration-200" style={{ color: "hsl(var(--accent))" }}>
                        Read <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No articles in this category yet.</p>
            </div>
          )}
        </section>

        {/* AUTHOR STRIP */}
        <section style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(220 20% 8%)" }}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Written by</p>
            <h2 className="text-xl font-semibold tracking-tight text-white">Arshad Segal</h2>
            <p className="text-sm leading-relaxed text-white/55">
              Founder of NextSlot. Writing about what actually works for independent service businesses in South Africa.
              Structure, systems, payments, and the decisions that compound over time.
            </p>
            <div className="pt-2">
              <Link
                to="/onboarding"
                className="group inline-flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 rounded-[10px] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.45)] hover:scale-[1.02]"
                style={{
                  background: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                }}
              >
                Try NextSlot Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
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
        </section>

      </main>
      <SiteFooter />
    </div>
  );
};

const categoryOpacity: Record<Exclude<Category, "All">, string> = {
  Business:   "0.80",
  Operations: "0.55",
  Finance:    "0.35",
};

const CategoryChip = ({ category, small = false }: { category: Exclude<Category, "All">; small?: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full font-semibold border ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]"}`}
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
