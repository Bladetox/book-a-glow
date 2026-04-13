import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=80";

const GOLD = "hsl(38 40% 58%)";

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

const CaseStudy = () => (
  <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />

    <main>

      {/* Hero */}
      <section className="relative w-full min-h-[420px] flex items-end overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={FEATURES_IMAGE}
            alt="PhenomeBeauty"
            fetchPriority="high"
            decoding="async"
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
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: GOLD }}>
            Where NextSlot came from
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight mb-4">
            It all started with PhenomeBeauty.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
            A mobile beauty studio owner doing everything alone. Bookings on WhatsApp, deposits via EFT, schedules in her head.
            This is her journey and the reason NextSlot exists.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Solo operator", "Mobile business", "No staff", "WhatsApp bookings", "Proof of payment chaos"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-[11px] font-medium"
                style={{
                  background: "hsl(38 40% 58% / 0.10)",
                  border: "1px solid hsl(38 40% 58% / 0.30)",
                  color: GOLD,
                }}
              >{tag}</span>
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
            <footer className="text-sm" style={{ color: GOLD }}>— PhenomeBeauty, NextSlot customer</footer>
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
              style={card.isFinal ? {
                background: "hsl(38 40% 58% / 0.07)",
                border: "1.5px solid hsl(38 40% 58% / 0.65)",
                boxShadow: "0 4px 24px hsl(38 40% 58% / 0.15)",
              } : {
                background: "hsl(var(--secondary) / 0.40)",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <span
                aria-hidden="true"
                className="absolute right-5 bottom-4 text-[5rem] font-black leading-none pointer-events-none select-none"
                style={{ color: card.isFinal ? "hsl(38 40% 58% / 0.12)" : "hsl(var(--foreground)/0.04)" }}
              >
                {card.step}
              </span>

              <div className="flex items-center justify-between gap-3 mb-5 relative z-10">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-0.5"
                    style={{ color: card.isFinal ? GOLD : "hsl(var(--muted-foreground))" }}
                  >
                    {card.label}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{card.version}</p>
                </div>
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={card.isFinal ? {
                    background: GOLD,
                    color: "hsl(var(--background))",
                  } : {
                    background: "hsl(var(--secondary))",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {parseInt(card.step)}
                </span>
              </div>

              <ul className="relative z-10 space-y-2.5">
                {card.points.map((pt, pi) => (
                  <li key={pi} className="flex items-start gap-2.5">
                    {card.isFinal ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
                    ) : (
                      <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 bg-muted-foreground/40" />
                    )}
                    <span className={`text-sm leading-relaxed ${card.isFinal ? "font-medium" : "text-muted-foreground"}`}>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 text-center bg-black">
        <div className="max-w-xl mx-auto space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>This is why NextSlot exists</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white leading-tight">
            If you run a service business in South Africa, this was built for you.
          </h2>
          <p className="text-sm text-white/55 leading-relaxed">
            Every lesson from building NextSlot for a real business is inside the product.
            Set up your booking page in minutes and let the system do the rest.
          </p>
          <div className="pt-2">
            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-8 py-3.5 rounded-[10px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                boxShadow: "0 0 0 1.5px hsl(38 40% 58% / 0.70), 0 6px 20px -2px hsl(38 40% 58% / 0.40)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 0 2px hsl(38 40% 58% / 0.90), 0 8px 28px -2px hsl(38 40% 58% / 0.55)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 0 1.5px hsl(38 40% 58% / 0.70), 0 6px 20px -2px hsl(38 40% 58% / 0.40)";
              }}
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-white/35">Try free for 30 days. No payment required.</p>
          </div>
        </div>
      </section>

    </main>
    <SiteFooter />
  </div>
);

export default CaseStudy;
