import { MobileFrame } from "@/components/site/DeviceFrames";
import { ArrowRight, Palette } from "lucide-react";
import { Link } from "react-router-dom";
import BookingAppPreview from "@/components/site/BookingAppPreview";

const LiveDemoSection = () => (
  <section className="bg-secondary/40 py-20 md:py-28">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Live Demo</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">See what your clients will experience</h2>
          <p className="text-muted-foreground leading-relaxed">
            This is a real NextSlot booking flow, loaded with dummy data. Select a service, pick a time slot, fill in your details, and confirm a booking with a deposit. This is exactly what your clients will see when they visit your booking page.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Mobile-first design that works beautifully on any device</li>
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Clients book in under 60 seconds. No phone calls, no back-and-forth</li>
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Deposits collected automatically at the time of booking</li>
            <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />Fully branded to match your business identity</li>
            <li className="flex items-start gap-2">
              <Palette className="mt-0.5 w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                <span className="font-semibold text-foreground">Multiple themes available.</span> Choose a look that feels like your brand, not a generic tool.
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
              <BookingAppPreview />
            </MobileFrame>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default LiveDemoSection;
