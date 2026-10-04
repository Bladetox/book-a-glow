import { PrimaryCTA } from "./PrimaryCTA";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import heroImage from "../../assets/NexSlot_Hero.png";
import MarketingDashboardSnapshot from "./MarketingDashboardSnapshot";

export const HeroSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section
      style={{
        position: "relative",
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
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
          objectPosition: "center 42%",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(5,5,5,0.96) 0%, rgba(5,5,5,0.88) 38%, rgba(5,5,5,0.40) 68%, rgba(5,5,5,0.24) 100%), linear-gradient(180deg, rgba(5,5,5,0.42) 0%, rgba(5,5,5,0.18) 45%, rgba(5,5,5,0.68) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 1240,
          margin: "0 auto",
          padding: isMobile ? "88px 24px 56px" : "96px 40px 84px",
        }}
      >
        <div
          style={{
            position: "relative",
            minHeight: isMobile ? 760 : 610,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 4,
              width: isMobile ? "100%" : "49%",
              paddingBottom: isMobile ? 300 : 0,
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
                fontSize: isMobile ? "clamp(32px,8.5vw,46px)" : "clamp(38px,4vw,56px)",
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
              More than<br />
              bookings. <span style={{ color: C.gold }}>Built for growth.</span>
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
              Take bookings online. Collect deposits and payments. Keep client history, availability and the work behind each appointment in one place. Then use what your business is telling you to decide what to do next.
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
              position: "absolute",
              zIndex: 3,
              right: isMobile ? "50%" : "-1%",
              bottom: isMobile ? 0 : 2,
              transform: isMobile ? "translateX(50%)" : "none",
              width: isMobile ? "min(760px, 118vw)" : "min(760px, 62vw)",
              maxWidth: 760,
              animation: "fadeSlideIn 0.7s 0.12s ease both",
            }}
          >
            <MarketingDashboardSnapshot />
          </div>
        </div>
      </div>
    </section>
  );
};
