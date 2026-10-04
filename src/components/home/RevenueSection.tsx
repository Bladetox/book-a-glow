import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";
import MarketingDashboardSnapshot from "./MarketingDashboardSnapshot";
import MarketingMobileDashboardSnapshot from "./MarketingMobileDashboardSnapshot";



export const RevenueSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;
  const desktopContentWidth = Math.min(1200, Math.max(0, width - 80));
  const snapshotWidth = Math.max(0, (desktopContentWidth - 80) / 2);
  const snapshotScale = snapshotWidth / 1000;
  const mobileSnapshotWidth = width < 380 ? 138 : 148;

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: C.bg,
        padding: isMobile ? "64px 16px" : "80px 40px",
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 32 : 80,
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <Eyebrow text="See the business behind the bookings" />
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: isMobile ? "clamp(28px,7vw,38px)" : "clamp(32px,3.4vw,46px)",
              fontWeight: 700,
              color: C.text,
              lineHeight: 1.08,
              marginBottom: 18,
              letterSpacing: "-0.02em",
            }}
          >
            Your bookings tell you{" "}
            <span style={{ color: C.gold }}>more than who is coming next.</span>
          </h2>
          <p
            style={{
              fontSize: 16,
              color: C.muted,
              lineHeight: 1.75,
              fontFamily: FONT_BODY,
              marginBottom: 30,
            }}
          >
            When your bookings, payments and client activity are connected, you get a clear picture of your business, not just what is happening today.
          </p>

          <div
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "14px 16px",
              border: `1px solid ${C.border2}`,
              borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: C.faint,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: C.text, fontWeight: 700 }}>See your business clearly.</strong>
            <span>Revenue. Bookings. Clients. Demand. Performance.</span>
          </div>

          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "16px 0 0", maxWidth: 480 }}>
            Everything in one place, so you spend less time piecing together the picture and more time deciding what to do with it.
          </p>
        </div>

        {!isMobile && (
        </div>

        {!isMobile && (
          <div
            style={{
              position: "relative",
              width: "100%",
              minHeight: 420,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: snapshotWidth,
                height: snapshotWidth * 0.76,
                maxWidth: "100%",
                filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.42))",
              }}
            >
              <MarketingDashboardSnapshot scale={snapshotScale} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
