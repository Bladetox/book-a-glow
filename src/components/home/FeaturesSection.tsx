import { BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

const GROUPS = [
  { number: "01", stage: "Capture", title: "Record the work as it happens.", description: "Bookings, payments, clients and daily operations." },
  { number: "02", stage: "Understand", title: "See the business behind the activity.", description: "Your booking activity becomes a clearer picture of revenue, demand and client behaviour." },
  { number: "03", stage: "Grow", title: "Focus on what matters to you.", description: "NextSlot surfaces the patterns and opportunities. You decide on the next steps." },
];

export const FeaturesSection = () => {
  const isMobile = useWindowWidth() < BP;
  return (
    <section className={`home-features${isMobile ? " is-mobile" : ""}`}>
      <div className="home-features__texture" aria-hidden="true" />
      <div className="home-features__inner">
        <header className="home-features__header">
          <Eyebrow text="How NextSlot works" />
          <h2>From every booking to a <span>clearer business.</span></h2>
          <p>Record what happens. Understand what it means. Focus on where you can grow.</p>
        </header>
        <div className="home-features__grid">
          {GROUPS.map(group => <article className="home-features__card" key={group.stage}>
            <div className="home-features__stage"><span>{group.number}</span><span>{group.stage}</span></div>
            <h3><span>{group.title.split(" ")[0]}</span>{" "}{group.title.split(" ").slice(1).join(" ")}</h3>
            <p>{group.description}</p>
          </article>)}
        </div>
      </div>
    </section>
  );
};
