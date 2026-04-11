import { useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import BookingAppPreview from "@/components/site/BookingAppPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import { ArrowRight, LayoutDashboard, Smartphone, Info } from "lucide-react";

const Demo = () => {
  const [tab, setTab] = useState<"dashboard" | "booking">("dashboard");

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-xs font-medium border border-foreground/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Interactive Demo — 100% Mock Data
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              See NextSlot in action
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
              This is a fully interactive demo using fictional data for a mock barbershop called{" "}
              <span className="font-semibold text-foreground">Blade &amp; Co.</span> no account required.
            </p>
          </div>

          {/* Demo notice banner */}
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 max-w-2xl mx-auto mb-10">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">Demo mode.</span> Everything you see here is fictional and for illustration purposes only. No bookings are created, no payments are processed, and no data is stored.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1 rounded-2xl bg-secondary border border-border gap-1">
              <button
                onClick={() => setTab("dashboard")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tab === "dashboard"
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin Dashboard
              </button>
              <button
                onClick={() => setTab("booking")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tab === "booking"
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Client Booking App
              </button>
            </div>
          </div>

          {/* DASHBOARD TAB */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              <p className="text-center text-xs text-muted-foreground">
                Click any sidebar icon to explore all dashboard sections
              </p>
              {/* Desktop: laptop + mobile side by side */}
              <div className="hidden md:flex items-end gap-6 justify-center">
                <div className="flex-1 max-w-[860px]">
                  <LaptopFrame interactive={true}>
                    <DashboardPreview />
                  </LaptopFrame>
                </div>
                <div className="w-[160px] shrink-0 -mb-1">
                  <MobileFrame interactive={true}>
                    <MobileDashboardPreview />
                  </MobileFrame>
                </div>
              </div>
              {/* Mobile: stacked */}
              <div className="md:hidden space-y-6">
                <div>
                  <p className="text-xs text-center text-muted-foreground mb-3 font-medium">Mobile Dashboard</p>
                  <div className="rounded-3xl border border-border shadow-xl overflow-hidden bg-[hsl(0,0%,4%)]">
                    <MobileDashboardPreview />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOOKING APP TAB */}
          {tab === "booking" && (
            <div className="space-y-6">
              <p className="text-center text-xs text-muted-foreground">
                Walk through the full booking flow your clients will experience
              </p>
              {/* Desktop: phone frame centered */}
              <div className="hidden md:flex justify-center">
                <div className="w-[320px]">
                  <MobileFrame interactive={true}>
                    <BookingAppPreview />
                  </MobileFrame>
                </div>
              </div>
              {/* Mobile: raw card */}
              <div className="md:hidden rounded-3xl border border-border shadow-xl overflow-hidden bg-white">
                <BookingAppPreview />
              </div>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="bg-secondary/40 border-t border-border py-16 md:py-20 text-center">
          <div className="max-w-xl mx-auto px-4 space-y-5">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Ready to set this up for your business?</h2>
            <p className="text-muted-foreground text-sm">Get your own booking page live in minutes. No payment required.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/onboarding"
                className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-7 py-3.5 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] transition-all duration-200"
              >
                Create Your Booking Page
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Demo;
