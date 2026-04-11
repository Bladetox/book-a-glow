import { useState } from "react";
import { ArrowRight, ArrowUpRight, Clock, BookOpen } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

/* ─── TYPES ─────────────────────────────────────────────────── */
type Category = "All" | "Business Growth" | "Operations" | "Marketing";

type Article = {
  title: string;
  excerpt: string;
  category: Exclude<Category, "All">;
  readTime: string;
  date: string;
  url: string;
  featured?: boolean;
  coverColor: string;
};

/* ─── ARTICLES ───────────────────────────────────────────────
   Add new articles at the TOP of this array.
   Set featured: true on the one you want to hero.
   coverColor is the fallback gradient when no image is used.
─────────────────────────────────────────────────────────────── */
const articles: Article[] = [
  {
    title: "Why Most Service Businesses Fail to Convert Social Media Followers Into Paying Clients",
    excerpt:
      "You have 4,000 followers on TikTok. Your videos get views. But your calendar is still half empty. The problem is not your content — it is the gap between attention and booking. Here is how to close it.",
    category: "Marketing",
    readTime: "5 min",
    date: "Apr 2025",
    url: "https://medium.com/@arshadsegal",
    featured: true,
    coverColor: "from-violet-950/80 to-background",
  },
  {
    title: "The Deposit Problem: How to Stop Chasing Payment Without Losing Clients",
    excerpt:
      "Asking for a deposit feels awkward. Not asking means you absorb no-shows. There is a middle path — and the businesses that find it stop losing money immediately.",
    category: "Operations",
    readTime: "4 min",
    date: "Mar 2025",
    url: "https://medium.com/@arshadsegal",
    coverColor: "from-emerald-950/80 to-background",
  },
  {
    title: "What Your Booking Data Is Actually Telling You (And How to Read It)",
    excerpt:
      "Revenue is a lagging indicator. The signals that predict next month's performance are already sitting in your booking history right now. Most owners never look.",
    category: "Business Growth",
    readTime: "6 min",
    date: "Mar 2025",
    url: "https://medium.com/@arshadsegal",
    coverColor: "from-amber-950/80 to-background",
  },
  {
    title: "From WhatsApp to a Real System: The Transition Every Service Business Has to Make",
    excerpt:
      "WhatsApp is where your business started. It is not where it should run. This is what the transition actually looks like — and why most people wait too long to make it.",
    category: "Operations",
    readTime: "5 min",
    date: "Feb 2025",
    url: "https://medium.com/@arshadsegal",
    coverColor: "from-sky-950/80 to-background",
  },
  {
    title: "Client Retention Is a System, Not a Personality Trait",
    excerpt:
      "The busiest service professionals are not always the most talented — they are the most consistent. Retention is not about being likeable. It is about having a process.",
    category: "Business Growth",
    readTime: "4 min",
    date: "Feb 2025",
    url: "https://medium.com/@arshadsegal",
    coverColor: "from-rose-950/80 to-background",
  },
  {
    title: "TikTok, Instagram, Google: Which Channel Actually Drives Bookings for Service Businesses?",
    excerpt:
      "Most service owners post everywhere and measure nothing. The channel that feels the most active is often not the one driving real revenue. Here is how to find out which one is.",
    category: "Marketing",
    readTime: "5 min",
    date: "Jan 2025",
    url: "https://medium.com/@arshadsegal",
    coverColor: "from-indigo-950/80 to-background",
  },
];

const categories: Category[] = ["All", "Business Growth", "Operations", "Marketing"];

const categoryColors: Record<Exclude<Category, "All">, string> = {
  "Business Growth": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Operations":      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "Marketing":       "bg-violet-500/15 text-violet-400 border-violet-500/25",
};

/* ─── PAGE ───────────────────────────────────────────────────── */
const Blog = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const featured = articles.find((a) => a.featured);
  const filtered = articles
    .filter((a) => !a.featured)
    .filter((a) => activeCategory === "All" || a.category === activeCategory);

  const allFiltered = activeCategory !== "All";
  const visibleFeatured = !allFiltered || featured?.category === activeCategory;

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main>

        {/* HERO */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 md:pt-24 md:pb-14">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">The NextSlot Blog</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 leading-[1.1]">
              Insights for service businesses that are serious about growth.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Practical thinking on bookings, retention, marketing, and what your data is actually telling you.
              Written by Arshad Segal, founder of NextSlot.
            </p>
          </div>
        </section>

        {/* CATEGORY FILTER */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={[
                  "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200",
                  activeCategory === cat
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {articles.length} articles
            </span>
          </div>
        </section>

        {/* FEATURED CARD — Von Restorff: full-width, isolated */}
        {featured && visibleFeatured && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative overflow-hidden rounded-3xl border border-border hover:border-accent/40 transition-all duration-300 shadow-soft hover:shadow-elevated"
              style={{
                border: "1px solid hsl(var(--accent) / 0.28)",
                boxShadow: "0 0 0 1px hsl(var(--accent)/0.06), inset 0 1px 0 hsl(var(--accent)/0.10)",
              }}
            >
              {/* Cover gradient */}
              <div className={`h-48 md:h-64 w-full bg-gradient-to-b ${featured.coverColor} bg-secondary/60`} />

              {/* Content */}
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${categoryColors[featured.category]}`}>
                    {featured.category}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />{featured.readTime} read
                  </span>
                  <span className="text-xs text-muted-foreground">{featured.date}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 group-hover:text-accent transition-colors leading-snug">
                  {featured.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-6">
                  {featured.excerpt}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:gap-3 transition-all duration-200">
                  Read on Medium <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </a>
          </section>
        )}

        {/* ARTICLE GRID */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          {filtered.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((article) => (
                <a
                  key={article.title}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background hover:border-accent/35 hover:shadow-[0_8px_32px_-8px_hsl(var(--accent)/0.18)] transition-all duration-300"
                >
                  {/* Cover */}
                  <div className={`h-36 w-full bg-gradient-to-b ${article.coverColor} bg-secondary/60 shrink-0`} />

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${categoryColors[article.category]}`}>
                        {article.category}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{article.readTime}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold leading-snug mb-2 group-hover:text-accent transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {article.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{article.date}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:gap-2 transition-all duration-200">
                        Read <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No articles in this category yet.</p>
            </div>
          )}
        </section>

        {/* PEAK-END: author strip + Medium CTA */}
        <section className="border-t border-border/50 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            <div className="max-w-xl mx-auto text-center space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">Written by</p>
              <h2 className="text-xl font-semibold tracking-tight">Arshad Segal</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Founder of NextSlot. Writing about what actually works for independent service businesses —
                bookings, retention, data, and the systems that make growth repeatable.
              </p>
              <a
                href="https://medium.com/@arshadsegal"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 border border-border text-sm font-medium px-6 py-3 rounded-[10px] hover:border-accent/50 hover:bg-secondary transition-all duration-200 mt-2"
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

export default Blog;
