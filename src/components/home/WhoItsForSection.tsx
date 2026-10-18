import { CarouselDots } from "./CarouselDots";
import beautyProfessional from "../../assets/beautician.jpg";
import barberProfessional from "../../assets/professional-barber-client-service.webp";
import creativeProfessional from "../../assets/professional-photographer-at-work.webp";
import consultingProfessional from "../../assets/consulting.webp";
import tattooArtist from "../../assets/tools-tattoo-artist-at-work.webp";
import massageTherapist from "../../assets/scene-beauty-treatment-room-aspiration.webp";

const audienceCards = [
  {
    label: "Beauty & Wellness",
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
    label: "Photographers",
    image: creativeProfessional,
    alt: "Photographer at work with a camera in the field",
    position: "center",
  },
  {
    label: "Consulting",
    image: consultingProfessional,
    alt: "Consultant working with a client on professional advice",
    position: "center",
  },
  {
    label: "Tattoo Artist",
    image: tattooArtist,
    alt: "Tattoo artist working carefully on a client's tattoo",
    position: "center",
  },
  {
    label: "Massage Therapist",
    image: massageTherapist,
    alt: "A calm massage treatment room prepared for a client",
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
          <p>From beauty and barbering to consulting, photography and tattooing, NextSlot helps you manage bookings. Work on the move? It automatically calculates your call-out fee, too.</p>
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
        <CarouselDots trackId="home-audience-track" count={6} label="Business types" />
        <p className="home-audience__swipe-hint">Swipe to explore more business types</p>
      </div>
    </section>
  );
};
