import { CarouselDots } from "./CarouselDots";
import beautyProfessional from "../../assets/beautician.jpg";
import barberProfessional from "../../assets/professional-barber-client-service.webp";
import creativeProfessional from "../../assets/professional-photographer-at-work.webp";

const audienceCards = [
  {
    label: "Beauty & wellness",
    image: beautyProfessional,
    alt: "Beauty professional delivering a treatment in a calm, prepared space",
    position: "center",
  },
  {
    label: "Barbers",
    image: barberProfessional,
    alt: "Barber working closely with a client in a professional barbershop",
    position: "center",
  },
  {
    label: "Creative & mobile",
    image: creativeProfessional,
    alt: "Photographer at work with a camera in the field",
    position: "center",
  },
];

export const WhoItsForSection = () => {
  return (
    <section id="who-its-for" className="home-audience">
      <div className="home-audience__inner">
        <div className="home-audience__copy">
          <p className="home-audience__eyebrow">Who it's for</p>
          <h2>Built for <span style={{ color: "#94672F" }}>independent</span> service businesses.</h2>
          <p>Beauty, barber, photography, tattoo, wellness and more. If you take bookings, NextSlot is for you.</p>
        </div>
        <div id="home-audience-track" className="home-audience__visuals" role="region" aria-label="Examples of independent service businesses" tabIndex={0}>
          {audienceCards.map((card) => (
            <figure className="home-audience__visual" key={card.label}>
              <img
                src={card.image}
                alt={card.alt}
                loading="lazy"
                decoding="async"
                style={{ objectPosition: card.position }}
              />
              <figcaption>{card.label}</figcaption>
            </figure>
          ))}
        </div>
        <CarouselDots trackId="home-audience-track" count={3} label="Business types" />
        <p className="home-audience__swipe-hint">Swipe to explore more business types</p>
      </div>
    </section>
  );
};
