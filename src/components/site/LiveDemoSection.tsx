import { MobileFrame } from "@/components/site/DeviceFrames";
import { ArrowRight, Palette } from "lucide-react";
import { Link } from "react-router-dom";

const DEMO_URL = "https://id-preview--955de3a9-2375-44dc-b62d-4d4687200e08.lovable.app";

const LiveDemoSection = () => (
  <section className="bg-secondary/40 py-20 md:py-28">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Live Demo</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">See what your clients will experience</h2>
          <p className="text-muted-foreground leading-relaxed">
            This is a real NextSlot booking page — loaded with dummy data so you can experience the full flow. Browse services, pick a time slot, and see exactly how effortless the booking experience feels for your clients. No downloads. No sign-ups required.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Mobile-first design that works beautifully on any device</li>
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Clients book in under 60 seconds — no phone calls, no back-and-forth</li>
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Fully branded to match your business identity</li>
            <li className="flex items-start gap-2">
              <Palette className="mt-0.5 w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                <span className="font-semibold text-foreground">Choose your theme.</span> NextSlot comes with multiple visual themes so your booking page looks and feels like <em>your</em> brand — not a generic tool.
              </span>
            </li>
          </ul>
          <Link to="/onboarding" className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-7 py-3.5 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] transition-all duration-200">
            Create yours now <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="flex justify-center">
          <div className="w-[280px]">
            <MobileFrame interactive={true}>
              <iframe
                src={DEMO_URL}
                title="NextSlot live booking demo — Blade & Co."
                className="w-full h-full border-0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
              />
            </MobileFrame>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default LiveDemoSection;
