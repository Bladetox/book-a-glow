import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";
import FigmaDashboardPreview from "./FigmaDashboardPreview";

export const RevenueSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section className="home-revenue">
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "block",
        }}
      >
        <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "left" }}>
          <Eyebrow text="See the business behind the bookings" />
          <h2 className="home-revenue__heading"
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
            <span style={{ color: C.goldDim }}>more than who is coming next.</span>
          </h2>
          <p
            style={{
              fontSize: 16,
              color: C.muted,
              lineHeight: 1.75,
              fontFamily: FONT_BODY,
              marginBottom: 20,
            }}
          >
            When your bookings, payments and client activity are connected, you get a clear picture of your business, not just what is happening today.
          </p>

          <div className="home-revenue__dashboard">
            <FigmaDashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
};
