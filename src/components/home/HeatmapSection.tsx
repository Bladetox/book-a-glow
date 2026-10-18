import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";
import { Orb } from "./Orb";
import { SpeechBubble } from "./SpeechBubble";
import FigmaDashboardPreview from "./FigmaDashboardPreview";

const HEAT_ROWS = [
  { day: "Mon", slots: [6, 9, 5, 7, 4] },
  { day: "Tue", slots: [2, 3, 2, 1, 2] },
  { day: "Wed", slots: [7, 11, 8, 9, 6] },
  { day: "Thu", slots: [4, 6, 5, 3, 4] },
  { day: "Fri", slots: [10, 14, 12, 13, 9] },
  { day: "Sat", slots: [15, 18, 16, 14, 11] },
  { day: "Sun", slots: [3, 4, 2, 2, 1] },
];
const heatColor = (v: number) => v < 4 ? C.emLight : v < 8 ? C.emMid : v < 12 ? C.em : C.emDeep;
const TIME_LABELS = ["9am", "11am", "1pm", "3pm", "5pm"];

export const HeatmapSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section className="home-heatmap" aria-labelledby="home-insight-heading">
      <div className="home-heatmap__inner">
        <header className="home-heatmap__header">
          <Eyebrow text="See the opportunity" />
          <h2 id="home-insight-heading">See what's <span>hiding</span> in your bookings.</h2>
          <p>Your booking history shows what is happening. Nexty helps you decide what to do next.</p>
        </header>

        <div className="home-heatmap__visual-row">
          <div className="home-heatmap__dashboard">
            <FigmaDashboardPreview />
          </div>
          <div className="home-heatmap__evidence">
            <div className="home-heatmap__evidence-heading">
              <span>THE SIGNAL</span>
              <h3>Booking demand by day and time</h3>
            </div>
            <div className="home-heatmap__grid" role="img" aria-label="Illustrative booking demand heatmap. Darker green cells indicate more bookings; lighter green cells indicate fewer bookings.">
              <div className="home-heatmap__times"><span />{TIME_LABELS.map(t => <span key={t}>{t}</span>)}</div>
              {HEAT_ROWS.map(row => (
                <div className="home-heatmap__row" key={row.day}>
                  <span className="home-heatmap__day">{row.day}</span>
                  {row.slots.map((v, i) => (
                    <span className="home-heatmap__cell" key={i} style={{ background: heatColor(v), color: v < 8 ? "#17251D" : "#FFFFFF" }}>{v}</span>
                  ))}
                </div>
              ))}
            </div>
            <div className="home-heatmap__legend"><span><i className="is-low" />Fewer bookings</span><span><i className="is-high" />More bookings</span></div>
            <p className="home-heatmap__peak">Saturday at 11am is the busiest illustrated slot, averaging 18 bookings.</p>
        </div>

        <div className="home-heatmap__story">
                    <article className="home-heatmap__nexty">
            <div className="home-heatmap__nexty-top">
              <div className="home-heatmap__orb"><Orb scale={isMobile ? 0.62 : 0.78} /></div>
              <div>
                <p className="home-heatmap__kicker">YOUR GROWTH ADVISOR</p>
                <h3><span>Nexty</span> is your growth advisor.</h3>
                <p className="home-heatmap__lead">Not just another dashboard. A clearer next step.</p>
              </div>
            </div>
            <SpeechBubble
              type="growth"
              speaker="Nexty"
              label="Growth opportunity"
              message="Tuesday afternoons sit empty most weeks. A mid-week offer could help fill those gaps."
              action="See the gap"
              delay={0}
            />
            <p className="home-heatmap__support">This recommendation is grounded in the booking patterns shown here.</p>
          </article>
        </div>
      </div>
    </section>
  );
};
