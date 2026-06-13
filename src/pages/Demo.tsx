import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import BookingAppPreview from "@/components/site/BookingAppPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import {
  ArrowRight, LayoutDashboard, Smartphone, Info,
  EyeOff, SlidersHorizontal, LayoutGrid
} from "lucide-react";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";

const CTA_BG     = "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW = "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

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
  <div style={{ maxWidth: 768, margin: "0 auto 32px" }}>
    <div style={{
      borderRadius: 16,
      border: `1px solid rgba(212,165,116,0.30)`,
      background: `rgba(212,165,116,0.06)`,
      padding: "16px 20px",
      marginBottom: 12,
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `rgba(212,165,116,0.15)`,
          border: `1px solid rgba(212,165,116,0.30)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <SlidersHorizontal style={{ height: 16, width: 16, color: C.gold }} strokeWidth={2} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONT_BODY, margin: 0 }}>
          Your dashboard, your way
        </p>
      </div>
      <p style={{
        fontSize: 14, color: C.muted, fontFamily: FONT_BODY, margin: 0,
        borderLeft: `1px solid ${C.border2}`, paddingLeft: 16, lineHeight: 1.6,
      }}>
        Look for the customise button in the dashboard header. You can switch any card on or off so your view stays focused on the metrics that matter to your business.
      </p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="demo-tips-grid">
      {customisationTips.map((tip) => {
        const Icon = tip.icon;
        return (
          <div
            key={tip.title}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              background: C.s1,
              padding: "16px",
            }}
          >
            <div style={{
              flexShrink: 0, marginTop: 2,
              width: 32, height: 32, borderRadius: 10,
              background: `rgba(212,165,116,0.12)`,
              border: `1px solid rgba(212,165,116,0.20)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ height: 16, width: 16, color: C.gold }} strokeWidth={2} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT_BODY, margin: "0 0 2px", lineHeight: 1.3 }}>
                {tip.title}
              </p>
              <p style={{ fontSize: 12, color: C.muted, fontFamily: FONT_BODY, margin: 0, lineHeight: 1.6 }}>
                {tip.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* Reliable mobile detection via JS — avoids CSS injection order issues */
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
    <div className="nextslot-theme dark-brand" style={{ minHeight: "100vh", background: C.bg, overflowX: "hidden" }}>
      <style>{HOME_STYLES}</style>
      <SiteHeader />
      <main>

        {/* Hero */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px 64px" }}>

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: `rgba(212,165,116,0.08)`,
              border: `1px solid rgba(212,165,116,0.2)`,
              borderRadius: 100, padding: "5px 14px",
              fontSize: 11, fontWeight: 700, color: C.gold,
              letterSpacing: "0.09em", textTransform: "uppercase",
              marginBottom: 24, fontFamily: FONT_BODY,
            } as React.CSSProperties}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block" }} />
              Interactive Demo - 100% Mock Data
            </div>

            <h1 style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(28px,3.5vw,42px)",
              fontWeight: 700, color: C.text,
              letterSpacing: "-0.02em", lineHeight: 1.1,
              margin: "0 0 16px",
            }}>
              See NextSlot in action
            </h1>

            <p style={{
              fontSize: 14, color: C.muted, fontFamily: FONT_BODY,
              maxWidth: 480, margin: "0 auto", lineHeight: 1.7,
            }}>
              This is a fully interactive demo using fictional data for a mock barbershop called{" "}
              <span style={{ fontWeight: 600, color: C.text }}>Blade &amp; Co.</span> No account required.
            </p>
          </div>

          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            background: `rgba(212,165,116,0.05)`,
            border: `1px solid rgba(212,165,116,0.18)`,
            borderRadius: 16,
            padding: "16px 20px",
            maxWidth: 640, margin: "0 auto 40px",
          }}>
            <Info style={{ width: 16, height: 16, color: C.gold, flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: C.muted, fontFamily: FONT_BODY, margin: 0, lineHeight: 1.7 }}>
              <span style={{ fontWeight: 600, color: C.text }}>Demo mode.</span> Everything you see here is fictional and for illustration purposes only. No bookings are created, no payments are processed, and no data is stored.
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <div style={{
              display: "inline-flex", padding: 4, borderRadius: 16,
              background: C.s1, border: `1px solid ${C.border}`, gap: 4,
            }}>
              <button
                onClick={() => setTab("dashboard")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 12,
                  fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY,
                  cursor: "pointer", transition: "all 0.2s",
                  background: tab === "dashboard" ? C.s2 : "transparent",
                  color: tab === "dashboard" ? C.text : C.muted,
                  border: tab === "dashboard" ? `1px solid ${C.border2}` : "1px solid transparent",
                  boxShadow: tab === "dashboard" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <LayoutDashboard style={{ width: 16, height: 16 }} />
                Admin Dashboard
              </button>
              <button
                onClick={() => setTab("booking")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 12,
                  fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY,
                  cursor: "pointer", transition: "all 0.2s",
                  background: tab === "booking" ? C.s2 : "transparent",
                  color: tab === "booking" ? C.text : C.muted,
                  border: tab === "booking" ? `1px solid ${C.border2}` : "1px solid transparent",
                  boxShadow: tab === "booking" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <Smartphone style={{ width: 16, height: 16 }} />
                Client Booking App
              </button>
            </div>
          </div>

          {/* DASHBOARD TAB */}
          {tab === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <DashboardCustomisationCallout />

              <p style={{ textAlign: "center", fontSize: 12, color: C.faint, fontFamily: FONT_BODY, margin: 0 }}>
                Click any sidebar icon to explore all dashboard sections
              </p>

              {/* Desktop: laptop + mobile side by side */}
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

              {/* Mobile: single phone preview in MobileFrame */}
              {isMobile && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ fontSize: 12, textAlign: "center", color: C.muted, fontFamily: FONT_BODY, fontWeight: 500, margin: 0 }}>
                    Mobile Dashboard
                  </p>
                  <div style={{ maxWidth: 300, margin: "0 auto", width: "100%" }}>
                    <MobileFrame interactive={true}>
                      <MobileDashboardPreview />
                    </MobileFrame>
                  </div>
                  <p style={{ textAlign: "center", fontSize: 12, color: C.faint, fontFamily: FONT_BODY, margin: 0 }}>
                    Toggle cards on or off from the customise button in the dashboard header.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* BOOKING APP TAB */}
          {tab === "booking" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <p style={{ textAlign: "center", fontSize: 12, color: C.faint, fontFamily: FONT_BODY, margin: 0 }}>
                Walk through the full booking flow your clients will experience
              </p>

              {/* Desktop: phone frame centered */}
              {!isMobile && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 320 }}>
                    <MobileFrame interactive={true}>
                      <BookingAppPreview />
                    </MobileFrame>
                  </div>
                </div>
              )}

              {/* Mobile: phone frame centered, full width bounded */}
              {isMobile && (
                <div style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
                  <div style={{ width: "100%", maxWidth: 320 }}>
                    <MobileFrame interactive={true}>
                      <BookingAppPreview />
                    </MobileFrame>
                  </div>
                </div>
              )}
            </div>
          )}

        </section>

        {/* CTA */}
        <section style={{
          background: C.s1,
          borderTop: `1px solid ${C.border}`,
          padding: "64px 24px",
          textAlign: "center",
        }}>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
            <h2 style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(22px,3vw,32px)",
              fontWeight: 700, color: C.text,
              letterSpacing: "-0.01em", lineHeight: 1.15,
              margin: 0,
            }}>
              Ready to set this up for your business?
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontFamily: FONT_BODY, margin: 0 }}>
              Get your own booking page live in minutes. No payment required.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <Link
                to="/onboarding"
                style={{
                  background: CTA_BG, boxShadow: CTA_SHADOW,
                  color: "#080808", fontFamily: FONT_BODY,
                  fontSize: 14, fontWeight: 700,
                  padding: "14px 30px", borderRadius: 10,
                  textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  minHeight: 48,
                }}
              >
                Create Your Booking Page
                <ArrowRight style={{ height: 16, width: 16 }} />
              </Link>
              <Link
                to="/pricing"
                style={{
                  fontSize: 14, fontWeight: 500, color: C.muted,
                  fontFamily: FONT_BODY, textDecoration: "none",
                  padding: "14px 4px", minHeight: 48,
                  display: "inline-flex", alignItems: "center",
                }}
              >
                View pricing
              </Link>
            </div>
            <p style={{ fontSize: 11, color: C.faint, letterSpacing: "0.04em", fontFamily: FONT_BODY, margin: 0 }}>
              No payment required · Free for 30 days · Cancel anytime
            </p>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
};

export default Demo;
