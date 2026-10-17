import { CarouselDots } from "./CarouselDots";

const audienceCardStyle: React.CSSProperties = {
  minHeight: 216,
  padding: 18,
  border: "1px solid rgba(126,96,58,.22)",
  borderRadius: 18,
  background: "linear-gradient(145deg, #F8F4ED 0%, #E8D6B9 100%)",
  boxShadow: "0 12px 28px rgba(66,48,27,.10), 0 2px 6px rgba(66,48,27,.04)",
};

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
          <div className="home-audience__visual" style={audienceCardStyle} role="img" aria-label="Beauty and wellness image placeholder">
            <span>Beauty & wellness<small>Image placeholder</small></span>
          </div>
          <div className="home-audience__visual" style={{ ...audienceCardStyle, transform: "translateY(12px)", background: "linear-gradient(145deg, #EDE4D7 0%, #D9C3A2 100%)" }} role="img" aria-label="Barber and grooming image placeholder">
            <span>Barbers<small>Image placeholder</small></span>
          </div>
          <div className="home-audience__visual" style={audienceCardStyle} role="img" aria-label="Creative and mobile services image placeholder">
            <span>Creative & mobile<small>Image placeholder</small></span>
          </div>
        </div>
        <CarouselDots trackId="home-audience-track" count={3} label="Business types" />
        <p className="home-audience__swipe-hint">Swipe to explore more business types</p>
      </div>
    </section>
  );
};
