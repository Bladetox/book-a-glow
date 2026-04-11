import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";

const About = () => (
  <div className="min-h-screen nextslot-theme bg-background">
    <SiteHeader />
    <main>

      {/* HERO -- split: left manifesto, right signature quote card
          UX: Serial Position Effect (strong first impression) +
              Aesthetic-Usability Effect (premium visual = perceived trust)
      */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        {/* Decorative vertical accent line */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px hidden lg:block"
          style={{ background: "linear-gradient(180deg, transparent, hsl(var(--accent)/0.18), transparent)" }}
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
                NextSlot is a booking and business intelligence platform built for South African service businesses.
                Designed with the reality of this market in mind, not a generic global template.
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
              {/* Radial accent glow inside card */}
              <div
                className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(var(--accent)/0.12) 0%, transparent 70%)",
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
                    { label: "Built for", value: "South Africa" },
                    { label: "Setup time", value: "20 min" },
                    { label: "Trial", value: "30 days free" },
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

      {/* Accent rule */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent)/0.4), transparent)" }}
      />

      {/* ORIGIN */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="prose-section space-y-5">
          <p className="text-base text-foreground/80 leading-relaxed">
            In South Africa, service businesses operate in one of the most competitive and price-sensitive
            environments in the world. Barbers, beauty studios, nail technicians, tattoo artists, massage
            therapists and independent creatives work long hours, build loyal communities, and carry the
            pressure of keeping their businesses running day after day. Yet the tools available to them
            often feel disconnected from how their businesses actually work.
          </p>
          <p className="text-base text-foreground/80 leading-relaxed">
            NextSlot was created to change that.
          </p>
        </div>
      </section>

      {/* THE IDEA */}
      <section className="bg-secondary/40 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">The Idea Behind NextSlot</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Technology that feels like part of your business.</h2>
          <p className="text-base text-foreground/80 leading-relaxed">
            NextSlot is a platform designed to help service-based businesses manage bookings, understand
            their data, and make smarter decisions. But the goal goes beyond software.
          </p>
          <blockquote className="border-l-2 border-accent pl-5 space-y-1">
            <p className="text-base font-semibold text-foreground">The vision is simple.</p>
            <p className="text-base text-muted-foreground italic">Technology should feel like part of your business, not something imposed on it.</p>
          </blockquote>
          <p className="text-base text-foreground/80 leading-relaxed">
            Instead of complicated dashboards, generic automation, and advice that ignores real-world
            conditions, NextSlot focuses on context. It looks at what is actually happening inside your
            business and turns that information into practical insights you can use.
          </p>
          <div className="space-y-2 pt-1">
            <p className="text-sm font-medium text-foreground">Not guru advice.</p>
            <p className="text-sm font-medium text-foreground">Not guesswork.</p>
            <p className="text-sm font-medium text-foreground">Real insights based on your business' real data.</p>
          </div>
          <p className="text-base text-foreground/80 leading-relaxed">
            In a market like South Africa, where raising prices, losing clients, or making the wrong
            decision can have real consequences, businesses need tools that are street smart as well as
            professional. NextSlot was designed with that reality in mind.
          </p>
        </div>
      </section>

      {/* BUILT FOR CREATIVES */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">A Platform Built for Creatives</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Relationships matter. Community matters. Reputation matters.</h2>
        <p className="text-base text-foreground/80 leading-relaxed">
          Creative service businesses are deeply human. NextSlot respects that.
        </p>
        <p className="text-base text-foreground/80 leading-relaxed">
          The platform is designed to feel familiar and supportive rather than cold or overly technical.
          It fits naturally into the way creative professionals already run their businesses, helping them
          stay organised, understand their growth, and serve their clients better.
        </p>
        <blockquote className="border-l-2 border-accent pl-5">
          <p className="text-base text-muted-foreground italic">
            It is technology that works quietly in the background while the real craft stays front and center.
          </p>
        </blockquote>
      </section>

      {/* FOUNDER */}
      <section className="bg-secondary/40 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">The Founder</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Arshad Segal</h2>
          <p className="text-base text-foreground/80 leading-relaxed">
            NextSlot was founded by Arshad Segal, an entrepreneur and builder driven by a simple belief.
          </p>
          <blockquote className="border-l-2 border-accent pl-5">
            <p className="text-base font-semibold text-foreground italic">
              Sometimes the biggest barrier to progress is waiting too long to start.
            </p>
          </blockquote>
          <p className="text-base text-foreground/80 leading-relaxed">
            Arshad has always been drawn to ideas that combine creativity, technology, and human behaviour.
            His work often sits at the intersection of entrepreneurship, storytelling, and systems thinking.
            He believes that when people are given the right tools and a clear path forward, they can build
            extraordinary things from ordinary beginnings.
          </p>
          <p className="text-base text-foreground/80 leading-relaxed">
            This philosophy is reflected in his broader creative work and personal brand, built around a
            message he returns to often:
          </p>
          <a
            href="https://www.tiktok.com/@chasing_dweams?_r=1&_t=ZS-94gSp7To9iS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-base font-bold text-foreground hover:text-accent transition-colors group"
          >
            Just Start.
            <ExternalLink className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>
          <p className="text-base text-foreground/80 leading-relaxed">
            NextSlot is a practical extension of that mindset, a tool created to help everyday business
            owners take the next step, make better decisions, and grow with confidence.
          </p>
        </div>
      </section>

      {/* MISSION */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Our Mission</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug">
          To give service businesses tools that feel like they were built by someone who actually understands their world.
        </h2>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Not overly complex.</p>
          <p className="text-sm font-medium text-foreground">Not disconnected from reality.</p>
          <p className="text-sm font-medium text-foreground">Just useful, thoughtful technology that helps businesses move forward.</p>
        </div>
        <p className="text-base text-foreground/80 leading-relaxed">
          Because behind every booking, every client, and every small studio is a person working hard
          to build something meaningful. NextSlot exists to support that journey.
        </p>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-primary text-primary-foreground py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">NextSlot</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Built for the people behind the chair, the studio, and the craft.
          </h2>
          <Link
            to="/onboarding"
            className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-semibold px-8 py-4 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)]"
          >
            Create Your Booking Page
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

    </main>
    <SiteFooter />
  </div>
);

export default About;
