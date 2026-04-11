import { ArrowRight, Palette, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

const THEME_SWATCHES = [
  { label: "Classic", bg: "bg-gray-900" },
  { label: "Dark",    bg: "bg-slate-700" },
  { label: "Blush",   bg: "bg-pink-300" },
  { label: "Sage",    bg: "bg-emerald-400" },
  { label: "Slate",   bg: "bg-slate-400" },
];

const LiveDemoSection = () => (
  <section className="bg-secondary/40 py-20 md:py-28">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">

        {/* Copy */}
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Live Demo</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">See what your clients will experience</h2>
          <p className="text-muted-foreground leading-relaxed">
            This is a real NextSlot booking flow. Select a service, pick a time slot, fill in your details, and confirm a booking with a deposit. This is exactly what your clients will see when they visit your booking page.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Mobile-first design that works beautifully on any device</li>
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Clients book in under 60 seconds. No phone calls, no back-and-forth</li>
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Deposits collected automatically at the time of booking</li>
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Fully branded to match your business identity</li>
            <li className="flex items-start gap-2">
              <Palette className="mt-0.5 w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                <span className="font-semibold text-foreground">Multiple themes available.</span>{" "}
                Choose a look that feels like your brand, not a generic tool.
              </span>
            </li>
          </ul>
        </div>

        {/* CTA card */}
        <div className="flex justify-center">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-background shadow-[0_8px_40px_-12px_hsl(var(--accent)/0.25)] overflow-hidden">

            {/* Card header */}
            <div className="bg-primary px-7 pt-8 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-5">
                <Smartphone className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-primary-foreground leading-snug">
                Try the full interactive demo
              </h3>
              <p className="text-sm text-primary-foreground/60 mt-2 leading-relaxed">
                Walk through a real booking flow and pick a theme that matches your brand — all before you sign up.
              </p>
            </div>

            {/* Theme swatches */}
            <div className="px-7 py-5 border-b border-border">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Available themes</p>
              <div className="flex items-center gap-2.5">
                {THEME_SWATCHES.map((t) => (
                  <div key={t.label} className="flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full ${t.bg} ring-2 ring-offset-2 ring-offset-background ring-transparent`} title={t.label} />
                    <span className="text-[10px] text-muted-foreground">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COMBINED CTA
                Was: "Launch Demo" button + separate "Create yours now" button
                in the copy column — two competing primary actions.
                Now: one primary + one soft secondary, both in the card,
                copy column has no standalone button cluttering the layout.
            */}
            <div className="px-7 py-6 space-y-3">
              <Link
                to="/demo"
                className="group w-full inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-semibold px-6 py-3.5 rounded-[10px] ring-1 ring-accent shadow-[0_4px_16px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.01] transition-all duration-200"
              >
                Launch Demo <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/onboarding"
                className="group w-full inline-flex items-center justify-center text-sm font-medium px-6 py-3 rounded-[10px] border border-border hover:border-accent/50 hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
              >
                Create your booking page <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <p className="text-center text-xs text-muted-foreground">No account required &middot; 100% mock data</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  </section>
);

export default LiveDemoSection;
