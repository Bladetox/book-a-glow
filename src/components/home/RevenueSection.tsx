import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";
import MarketingDashboardSnapshot from "./MarketingDashboardSnapshot";
import MarketingMobileDashboardSnapshot from "./MarketingMobileDashboardSnapshot";

export const RevenueSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;
  const snapshotWidth = isMobile ? Math.min(width - 32, 320) : 520;
  const snapshotScale = snapshotWidth / 1000;

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: C.bg,
        padding: isMobile ? "72px 16px" : "104px 40px",
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "0.82fr 1.18fr",
          gap: isMobile ? 48 : 72,
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
            Every booking and payment adds to a clearer picture of the business. NextSlot brings revenue, booking activity, client information and what needs attention into one place, so you can make decisions from what is actually happening.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                title: "Bookings become a record",
                body: "Appointments, payments and client activity stay connected.",
              },
              {
                title: "The dashboard shows the pattern",
                body: "Revenue, bookings, business health and services come into view together.",
              },
              {
                title: "Decide where you want to grow",
                body: "Turn your booking patterns into decisions that support the growth you want.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    background: i === 2 ? C.gold : C.s2,
                    color: i === 2 ? "#080808" : C.gold,
                    border: i === 2 ? "none" : `1px solid ${C.border2}`,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: FONT_BODY,
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.text,
                      marginBottom: 3,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.faint,
                      lineHeight: 1.55,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    {item.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: isMobile ? snapshotWidth * (844 / 390) : 420,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: snapshotWidth,
              height: isMobile ? snapshotWidth * (844 / 390) : 420,
              maxWidth: "100%",
              filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.42))",
            }}
          >
            {isMobile ? <MarketingMobileDashboardSnapshot /> : <MarketingDashboardSnapshot scale={snapshotScale} />}
          </div>
        </div>
      </div>
    </section>
  );
};
