import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import DemoDeviceIframe from "@/components/site/DemoDeviceIframe";
import BookingAppPreview from "@/components/site/BookingAppPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import {
  LayoutDashboard, Smartphone, Info,
  SlidersHorizontal
} from "lucide-react";
import { C, MK, SECTION } from "@/components/home/tokens";

const DashboardCustomisationCallout = () => (
  <div style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}>
    <div style={{
      ...MK.card,
      background: "rgba(184,139,82,0.08)",
      border: "1px solid rgba(184,139,82,0.35)",
      boxShadow: "none",
      padding: "16px 20px",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
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
        Select the highlighted eye icon in the dashboard to customise your view. Toggle a section off to see how your workspace adapts.
      </p>
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

const demoContext: Record<"dashboard" | "booking", string> = {
  dashboard:
    "This is your back office where you run the business. Bookings, services, payments, and clients.",
  booking:
    "Your clients will love the frictionless booking. No login, no app download.",
};

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
            <p style={MK.eyebrow}>Demo · Interactive walkthrough</p>
            <h1 style={MK.h1}>
              See NextSlot <span style={MK.accent}>in action.</span>
            </h1>
            <p style={{ ...MK.lead, maxWidth: 560, margin: "0 auto" }}>
              Explore your admin dashboard, where you'll run your business, and the booking page your clients will use.
              Example for a bridal makeup studio called{" "}
              <span style={{ fontWeight: 600, color: C.text }}>Brush &amp; Veil</span>.
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
                Owner dashboard
              </button>
              <button
                role="tab"
                aria-selected={tab === "booking"}
                className={`demo-tab-button${tab === "booking" ? " is-active" : ""}`}
                onClick={() => setTab("booking")}
              >
                <Smartphone style={{ width: 16, height: 16 }} />
                Client booking view
              </button>
            </div>
          </div>

          {/* Animated stage — remounts per tab so the panel animation replays */}
          <div
            key={tab}
            className={`demo-tab-panel demo-stage demo-stage--${tab}`}
            style={{ paddingTop: isMobile ? 8 : 24 }}
          >

            <p style={{
              ...MK.small,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
              color: C.text,
              maxWidth: 480,
              margin: "0 auto 24px",
            }}>
              {demoContext[tab]}
            </p>

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
                      <LaptopFrame interactive={true} fill>
                        <DemoDeviceIframe device="desktop" src="/demo/admin-embed" title="NextSlot admin dashboard (desktop demo)" />
                      </LaptopFrame>
                    </div>
                    <div style={{ width: 220, flexShrink: 0, marginBottom: -4 }}>
                      <MobileFrame interactive={true} fill>
                        <DemoDeviceIframe device="mobile" src="/demo/admin-embed" title="NextSlot admin dashboard (mobile demo)" />
                      </MobileFrame>
                    </div>
                  </div>
                )}

                {isMobile && (
                  <div style={{ maxWidth: 300, margin: "0 auto", width: "100%" }}>
                    <MobileFrame interactive={true} fill>
                      <DemoDeviceIframe device="mobile" src="/demo/admin-embed" title="NextSlot admin dashboard (mobile demo)" />
                    </MobileFrame>
                  </div>
                )}
              </div>
            )}

            {/* BOOKING APP TAB */}
            {tab === "booking" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="demo-progress" aria-label="Booking flow steps">
                  <span className="demo-progress__step is-current">Service</span>
                  <span className="demo-progress__sep">→</span>
                  <span className="demo-progress__step">Date &amp; time</span>
                  <span className="demo-progress__sep">→</span>
                  <span className="demo-progress__step">Your details</span>
                  <span className="demo-progress__sep">→</span>
                  <span className="demo-progress__step">Review + Pay</span>
                </div>

                <div style={{ display: "flex", justifyContent: "center", padding: isMobile ? "0 16px" : 0 }}>
                  <div style={{ width: "100%", maxWidth: 320 }}>
                    <MobileFrame interactive={true}>
                      <BookingAppPreview />
                    </MobileFrame>
                  </div>
                </div>
              </div>
            )}

          </div>

        </section>

        {/* CTA */}
        <section style={{ padding: isMobile ? SECTION.mobile : SECTION.desktop, background: C.s1, borderTop: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <p style={MK.eyebrow}>Ready to start?</p>
            <h2 style={MK.h2}>Set this up for my business.</h2>
            <p style={{ ...MK.body, margin: "0 auto 32px" }}>
              Get your own booking page live in minutes.
            </p>
            <div className="marketing-cta-row">
              <PrimaryCTA to="/onboarding">
                Create Your Booking Page
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
