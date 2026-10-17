import { BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";
import { CarouselDots } from "./CarouselDots";
import captureImage from "../../assets/professional-using-nextslot-payment-workflow.webp";
import seeImage from "../../assets/nextslot-dashboard-product-showcase.webp";
import focusImage from "../../assets/scene-beauty-treatment-room-aspiration.webp";

const GROUPS = [
  {
    stage: "Capture",
    title: "Record the work as it happens.",
    description: "Bookings, payments, clients and daily operations.",
    image: captureImage,
    alt: "A business owner checking NextSlot on a phone while managing a payment",
    imageFit: "cover",
  },
  {
    stage: "See",
    title: "Understand what the activity means.",
    description: "Revenue, demand and client behaviour become easier to see.",
    image: seeImage,
    alt: "NextSlot business dashboard displayed on a smartphone",
    imageFit: "contain",
  },
  {
    stage: "Focus",
    title: "Focus on what matters to you.",
    description: "Spot useful patterns and decide what to do next.",
    image: focusImage,
    alt: "A calm, prepared independent beauty treatment space",
    imageFit: "cover",
  },
];

export const FeaturesSection = () => {
  const isMobile = useWindowWidth() < BP;
  return (
    <section id="how-nextslot-works" className={`home-features${isMobile ? " is-mobile" : ""}`}>
      <div className="home-features__texture" aria-hidden="true" />
      <div className="home-features__inner">
        <header className="home-features__header">
          <Eyebrow text="How it works" />
          <h2>From every booking to a <span>clearer business.</span></h2>
          <p>Record what happens. Understand what it means. Focus on what matters to you.</p>
        </header>
        <div id="home-features-track" className="home-features__grid" role="region" aria-label="Three stages of how NextSlot works" tabIndex={0}>
          {GROUPS.map(group => <article className="home-features__card" key={group.stage}>
            <div className="home-features__stage"><span>{group.stage}</span></div>
            <div className={`home-features__visual home-features__visual--${group.stage.toLowerCase()} home-features__visual--image`}>
              {group.stage === "Capture" && <span className="home-features__image-note" title="Starter workflow">＊</span>}
              <img
                src={group.image}
                alt={group.alt}
                loading="lazy"
                decoding="async"
                className={`home-features__image home-features__image--${group.imageFit}`}
              />
            </div>
            <h3><span>{group.title.split(" ")[0]}</span>{" "}{group.title.split(" ").slice(1).join(" ")}</h3>
            <p>{group.description}</p>
          </article>)}
        </div>
        <CarouselDots trackId="home-features-track" count={GROUPS.length} label="How NextSlot works" />
        <p className="home-features__swipe-hint">Swipe to explore all three stages</p>
      </div>
    </section>
  );
};
