import { Eyebrow } from "./Eyebrow";
import BookingHeatmap, { type HeatmapRow } from "@/components/shared/BookingHeatmap";
import { Orb } from "./Orb";
import { SpeechBubble } from "./SpeechBubble";
import FigmaDashboardPreview from "./FigmaDashboardPreview";

const TIME_LABELS = ["9am", "11am", "1pm", "3pm", "5pm"];
const HEAT_ROWS: HeatmapRow[] = [
  { day: "Mon", slots: [6, 9, 5, 7, 4].map((intensity, i) => ({ slot: TIME_LABELS[i], intensity })) },
  { day: "Tue", slots: [2, 3, 2, 1, 2].map((intensity, i) => ({ slot: TIME_LABELS[i], intensity })) },
  { day: "Wed", slots: [7, 11, 8, 9, 6].map((intensity, i) => ({ slot: TIME_LABELS[i], intensity })) },
  { day: "Thu", slots: [4, 6, 5, 3, 4].map((intensity, i) => ({ slot: TIME_LABELS[i], intensity })) },
  { day: "Fri", slots: [10, 14, 12, 13, 9].map((intensity, i) => ({ slot: TIME_LABELS[i], intensity })) },
  { day: "Sat", slots: [15, 18, 16, 14, 11].map((intensity, i) => ({ slot: TIME_LABELS[i], intensity })) },
  { day: "Sun", slots: [3, 4, 2, 2, 1].map((intensity, i) => ({ slot: TIME_LABELS[i], intensity })) },
];

export const HeatmapSection = () => {
  return (
    <section className="home-heatmap" aria-labelledby="home-insight-heading">
      <div className="home-heatmap__inner">
        <header className="home-heatmap__header">
          <Eyebrow text="See the business behind the bookings" />
          <h2 id="home-insight-heading">Your bookings tell you <span>more than who is coming next.</span></h2>
          <p>When your bookings, payments and client activity are connected, you get a clearer picture of your business.</p>
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
            <div className="home-heatmap__shared-grid">
              <BookingHeatmap data={HEAT_ROWS} />
            </div>
            <div className="home-heatmap__legend"><span><i />Fewer bookings</span><span><i />More bookings</span></div>
            <p className="home-heatmap__peak">Saturday at 11am is the busiest illustrated slot, averaging 18 bookings.</p>
          </div>
        </div>

        <div className="home-heatmap__story">
          <article className="home-heatmap__nexty">
            <div className="home-heatmap__nexty-top">
              <div className="home-heatmap__orb"><Orb /></div>
              <div className="home-heatmap__nexty-copy">
                <p className="home-heatmap__kicker">YOUR GROWTH ADVISOR</p>
                <h3><span>Nexty</span> is your growth advisor.</h3>
                <p className="home-heatmap__lead">Nexty analyses your bookings and suggests steps to help your business grow.</p>
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
          </article>
        </div>
      </div>
    </section>
  );
};
