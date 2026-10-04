import { PrimaryCTA } from "./PrimaryCTA";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import heroImage from "../../assets/NexSlot_Hero.png";
import MarketingDashboardSnapshot from "./MarketingDashboardSnapshot";
import { ProductSnapshotFrame } from "./ProductSnapshotFrame";

export const HeroSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;
  const dashboardWidth = isMobile ? Math.min(width - 32, 560) : Math.min(540, Math.max(460, width * 0.38));
  const dashboardHeight = dashboardWidth * 0.76;

  return (
    <section
      style={{
        position: "relative",
        minHeight: isMobile ? "auto" : "calc(100vh - 64px)",
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        overflow: "hidden",
        background: C.bg,
      }}
    >
      <img
        src={heroImage}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 40%",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(5,5,5,0.82) 0%, rgba(5,5,5,0.66) 42%, rgba(5,5,5,0.24) 72%, rgba(5,5,5,0.18) 100%), linear-gradient(180deg, rgba(5,5,5,0.30) 0%, rgba(5,5,5,0.08) 48%, rgba(5,5,5,0.60) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 1240,
          margin: "0 auto",
          padding: isMobile ? "76px 16px 48px" : "88px 40px 72px",
        }}
      >
        <div
          style={{
            position: "relative",
            minHeight: isMobile ? "auto" : 600,
            display: isMobile ? "flex" : "block",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 4,
              width: isMobile ? "100%" : "47%",
              paddingTop: isMobile ? 8 : 0,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: FONT_BODY,
                marginBottom: 24,
                animation: "fadeUp 0.5s ease both",
              }}
            >
              For independent service businesses
            </p>

            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: isMobile ? "clamp(34px,9vw,46px)" : "clamp(40px,4vw,56px)",
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.06,
                letterSpacing: "-0.025em",
                margin: 0,
                marginBottom: 22,
                maxWidth: 560,
                animation: "fadeUp 0.5s 0.08s ease both",
              }}
            >
              Record. <span style={{ color: C.gold }}>Understand.</span> Grow.
            </h1>

            <p
              style={{
                fontSize: isMobile ? 15 : 17,
                color: C.muted,
                lineHeight: 1.65,
                marginBottom: 32,
                maxWidth: 500,
                fontFamily: FONT_BODY,
                fontWeight: 400,
                animation: "fadeUp 0.5s 0.16s ease both",
              }}
            >
              NextSlot records your bookings, turns them into a clear picture of your business, and helps you make better growth decisions based on the patterns in your bookings.
            </p>

            <div
              style={{
                animation: "fadeUp 0.5s 0.24s ease both",
                display: "flex",
                flexDirection: "column",
                alignItems: isMobile ? "stretch" : "flex-start",
              }}
            >
              <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
              <p
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: C.faint,
                  fontFamily: FONT_BODY,
                  fontWeight: 400,
                  textAlign: isMobile ? "center" : "left",
                }}
              >
                No payment required · Free trial · Built in South Africa
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px 18px",
                marginTop: 28,
                color: C.faint,
                fontFamily: FONT_BODY,
                fontSize: 11,
                lineHeight: 1.5,
                animation: "fadeUp 0.5s 0.32s ease both",
              }}
            >
              <span>Bookings</span>
              <span>Payments</span>
              <span>Clients</span>
              <span>Operations</span>
              <span>Insights</span>
            </div>
          </div>

          <div
            style={{
              position: isMobile ? "relative" : "absolute",
              zIndex: 3,
              right: isMobile ? "auto" : 18,
              top: isMobile ? "auto" : 82,
              bottom: isMobile ? "auto" : undefined,
              width: dashboardWidth,
              height: dashboardHeight,
              marginTop: isMobile ? 52 : 0,
              alignSelf: isMobile ? "center" : "auto",
              animation: "fadeSlideIn 0.7s 0.12s ease both",
            }}
          >
            <ProductSnapshotFrame width={dashboardWidth} shadow="hero">
              <MarketingDashboardSnapshot />
            </ProductSnapshotFrame>
          </div>
        </div>
      </div>
    </section>
  );
};
