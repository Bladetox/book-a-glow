import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";
import { RevenueChart } from "./RevenueChart";

export const CaseStudySection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section
      style={{
        background: C.bg,
        padding: isMobile ? "64px 16px 72px" : "80px 40px 88px",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? 20 : 28,
            maxWidth: 760,
            margin: "0 auto",
            padding: isMobile ? "0 8px" : 0,
          }}
        >
          <div
            style={{
              width: isMobile ? 72 : 88,
              height: isMobile ? 72 : 88,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              border: "2px solid rgba(212,165,116,0.42)",
              background: "rgba(212,165,116,0.08)",
            }}
          >
            <img
              src="https://iili.io/Cxw0jRI.jpg"
              alt="Shu-meez, Owner of PhenomeBeauty"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
            />
          </div>

          <div>
            <Eyebrow text="What NextSlot helped PhenomeBeauty see" />
            <blockquote
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: isMobile ? 24 : 34,
                fontWeight: 700,
                lineHeight: 1.15,
                color: C.text,
                margin: "10px 0 12px",
                letterSpacing: "-0.02em",
              }}
            >
              “For the first time, business felt like it was running itself.”
            </blockquote>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0, fontFamily: FONT_BODY }}>
              Shu-meez · Owner, PhenomeBeauty · Cape Town
            </p>
          </div>
        </div>

        <div
          style={{
            margin: isMobile ? "40px auto 0" : "56px auto 0",
            maxWidth: 760,
            background: C.s2,
            border: `1px solid ${C.border2}`,
            borderRadius: 18,
            padding: isMobile ? "20px 18px" : "24px 28px",
          }}
        >
          <RevenueChart />
        </div>

        <div style={{ maxWidth: 680, margin: isMobile ? "28px auto 0" : "32px auto 0", textAlign: "center" }}>
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: isMobile ? 20 : 24,
              fontWeight: 700,
              color: C.text,
              lineHeight: 1.25,
              margin: "0 0 10px",
            }}
          >
            NextSlot facilitated bookings and business growth resulting in R63,851 over 90 days.
          </p>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, margin: "0 0 22px", fontFamily: FONT_BODY }}>
            That meant more than easier booking admin. The business could see its revenue, demand and client activity clearly enough to make better decisions.
          </p>
          <Link
            to="/about#case-study"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              padding: "12px 22px",
              borderRadius: 10,
              border: `1px solid rgba(212,165,116,0.28)`,
              background: "rgba(212,165,116,0.05)",
              color: C.gold,
              fontFamily: FONT_BODY,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Read the full story
          </Link>
        </div>
      </div>
    </section>
  );
};