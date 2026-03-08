import { MobileFrame } from "@/components/site/DeviceFrames";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const LiveDemoSection = () => (
  <section className="bg-secondary/40 py-20 md:py-28">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Live Demo</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">See what your clients will experience</h2>
          <p className="text-muted-foreground leading-relaxed">This is a real NextSlot booking page. Browse treatments, pick a date, and see how effortless the booking flow feels. No downloads, no sign-ups required from your clients.</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {["Mobile-first design that works on any device", "Clients book in under 60 seconds", "Branded to match your business identity"].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                {t}
              </li>
            ))}
          </ul>
          <Link to="/onboarding" className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-7 py-3.5 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] transition-all duration-200">
            Create yours now
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="flex justify-center">
          <div className="w-[280px]">
            <MobileFrame interactive={true}>
              <iframe src="/book" title="NextSlot live booking demo" className="w-full h-full border-0" loading="lazy" sandbox="allow-scripts allow-same-origin" />
            </MobileFrame>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default LiveDemoSection;
