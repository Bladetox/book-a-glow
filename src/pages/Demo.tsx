import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import BookingAppPreview from "@/components/site/BookingAppPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import {
  ArrowRight, LayoutDashboard, Smartphone, Info,
  EyeOff, SlidersHorizontal, LayoutGrid
} from "lucide-react";
import { C, MK, SECTION } from "@/components/home/tokens";

const customisationTips = [
  {
    icon: SlidersHorizontal,
    title: "Toggle cards on or off",
    desc: "Use the customise button in the dashboard header to show or hide any data card. Keep only what is relevant to your day.",
  },
  {
    icon: EyeOff,
    title: "Hide what you do not need",
    desc: "Not tracking inventory? Not running loyalty yet? Turn those cards off so your dashboard stays clean and focused.",
  },
  {
    icon: LayoutGrid,
    title: "Your layout, your choice",
    desc: "Every business is different. Your dashboard should reflect how you actually run yours, not a generic template.",
  },
];

const DashboardCustomisationCallout = () => (
  <div style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}>
    <div style={{
      ...MK.card,
      background: "rgba(184,139,82,0.08)",
      border: "1px solid rgba(184,139,82,0.35)",
      boxShadow: "none",
      padding: "16px 20px",
      marginBottom: 12,
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 2,
          background: "rgba(184,139,82,0.15)",
          border: "1px solid rgba(184,139,82,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <SlidersHorizontal style={{ height: 16, width: 16, color: C.goldDim }} strokeWidth={2} />
        </div>
        <p style={{ ...MK.small, fontSize: 14, fontWeight: 600, color: C.text }}>
          Your dashboard, your way
        </p>
      </div>
      <p style={{ ...MK.small, fontSize: 14, flex: "1 1 260px" }}>
        Look for the customise button in the dashboard header. Switch any card on or off so your view stays focused on the metrics that matter to your business.
      </p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="demo-tips-grid">
      {customisationTips.map((tip) => {
        const Icon = tip.icon;
        return (
          <div
            key={tip.title}
            style={{ ...MK.card, display: "flex", alignItems: "flex-start", gap: 12, padding: 16 }}
          >
            <div style={{
              flexShrink: 0, marginTop: 2,
              width: 32, height: 32, borderRadius: 2,
              background: "rgba(184,139,82,0.12)",
              border: "1px solid rgba(184,139,82,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ height: 16, width: 16, color: C.goldDim }} strokeWidth={2} />
            </div>
            <div>
              <p style={{ ...MK.small, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                {tip.title}
              </p>
              <p style={{ ...MK.small, fontSize: 13 }}>{tip.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* Reliable mobile detection via JS */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

const Demo = () => {
  const [tab, setTab] = useState<"dashboard" | "booking">("dashboard");
  const isMobile = useIsMobile();

  return (
    <MarketingLayout>
      <SiteHeader />
      <main>

        {/* Hero + interactive demo */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? SECTION.heroMobile : "120px 24px 68px" }}>

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={MK.eyebrow}>How it works · Interactive demo</p>
            <h1 style={MK.h1}>
              See NextSlot <span style={MK.accent}>in action.</span>
            </h1>
            <p style={{ ...MK.lead, maxWidth: 560, margin: "0 auto" }}>
              Explore the admin dashboard you run your business from and the booking page your clients use.
              Everything is fictional data for a mock bridal makeup studio called{" "}
              <span style={{ fontWeight: 600, color: C.text }}>Brush &amp; Veil</span>. No account required.
            </p>
          </div>

          <div style={{
            ...MK.card,
            display: "flex", alignItems: "flex-start", gap: 12,
            background: "rgba(184,139,82,0.06)",
            border: "1px solid rgba(184,139,82,0.25)",
            boxShadow: "none",
            padding: "16px 20px",
            maxWidth: 640, margin: "0 auto 40px",
          }}>
            <Info style={{ width: 16, height: 16, color: C.goldDim, flexShrink: 0, marginTop: 2 }} />
            <p style={{ ...MK.small, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: C.text }}>Demo mode.</span> No bookings are created, no payments are processed, and no data is stored.
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div className="demo-tab-switcher" role="tablist" aria-label="Choose a demo">
              <button
                role="tab"
                aria-selected={tab === "dashboard"}
                className={`demo-tab-button${tab === "dashboard" ? " is-active" : ""}`}
                onClick={() => setTab("dashboard")}
              >
                <LayoutDashboard style={{ width: 16, height: 16 }} />
                Admin dashboard
              </button>
              <button
                role="tab"
                aria-selected={tab === "booking"}
                className={`demo-tab-button${tab === "booking" ? " is-active" : ""}`}
                onClick={() => setTab("booking")}
              >
                <Smartphone style={{ width: 16, height: 16 }} />
                Public booking app
              </button>
            </div>
          </div>

          {/* DASHBOARD TAB */}
          {tab === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <DashboardCustomisationCallout />

              <p style={{ ...MK.small, textAlign: "center", fontSize: 12, color: C.faint }}>
                {isMobile
                  ? "Tap the icons in the dashboard to explore each section."
                  : "Click any sidebar icon to explore all dashboard sections."}
              </p>

              {!isMobile && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 24, justifyContent: "center" }}>
                  <div style={{ flex: 1, maxWidth: 860 }}>
                    <LaptopFrame interactive={true}>
                      <DashboardPreview />
                    </LaptopFrame>
                  </div>
                  <div style={{ width: 160, flexShrink: 0, marginBottom: -4 }}>
                    <MobileFrame interactive={true}>
                      <MobileDashboardPreview />
                    </MobileFrame>
                  </div>
                </div>
              )}

              {isMobile && (
                <div style={{ maxWidth: 300, margin: "0 auto", width: "100%" }}>
                  <MobileFrame interactive={true}>
                    <MobileDashboardPreview />
                  </MobileFrame>
                </div>
              )}
            </div>
          )}

          {/* BOOKING APP TAB */}
          {tab === "booking" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <p style={{ ...MK.small, textAlign: "center", fontSize: 12, color: C.faint }}>
                Walk through the full booking flow your clients will experience.
              </p>
              <div style={{ display: "flex", justifyContent: "center", padding: isMobile ? "0 16px" : 0 }}>
                <div style={{ width: "100%", maxWidth: 320 }}>
                  <MobileFrame interactive={true}>
                    <BookingAppPreview />
                  </MobileFrame>
                </div>
              </div>
            </div>
          )}

        </section>

        {/* CTA */}
        <section style={{ padding: isMobile ? SECTION.mobile : SECTION.desktop, background: C.s1, borderTop: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <p style={MK.eyebrow}>Ready to start?</p>
            <h2 style={MK.h2}>Set this up for your business.</h2>
            <p style={{ ...MK.body, margin: "0 auto 32px" }}>
              Get your own booking page live in minutes.
            </p>
            <div className="marketing-cta-row">
              <PrimaryCTA to="/onboarding">
                Create Your Booking Page
                <ArrowRight className="marketing-cta__arrow" aria-hidden="true" />
              </PrimaryCTA>
              <Link to="/pricing" className="marketing-cta marketing-cta--secondary">
                View pricing
              </Link>
            </div>
            <p style={{ ...MK.small, fontSize: 12, color: C.faint, letterSpacing: "0.04em", marginTop: 16 }}>
              No payment required · Free trial · Cancel anytime
            </p>
          </div>
        </section>

      </main>
      <SiteFooter />
    </MarketingLayout>
  );
};

export default Demo;
