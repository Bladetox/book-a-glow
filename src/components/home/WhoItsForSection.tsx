export const WhoItsForSection = () => {
  return (
    <section id="who-its-for" className="home-audience">
      <div className="home-audience__inner">
        <div className="home-audience__copy">
          <p className="home-audience__eyebrow">01 · Who it's for</p>
          <h2>Built for independent service businesses.</h2>
          <p>Beauty, barber, photography, tattoo, wellness and more. If you take bookings, NextSlot is for you.</p>
        </div>
        <div className="home-audience__visuals" role="region" aria-label="Examples of independent service businesses" tabIndex={0}>
          <div className="home-audience__visual" role="img" aria-label="Beauty and wellness image placeholder">
            <span>Beauty & wellness<small>Image placeholder</small></span>
          </div>
          <div className="home-audience__visual" role="img" aria-label="Barber and grooming image placeholder">
            <span>Barbers<small>Image placeholder</small></span>
          </div>
          <div className="home-audience__visual" role="img" aria-label="Creative and mobile services image placeholder">
            <span>Creative & mobile<small>Image placeholder</small></span>
          </div>
        </div>
        <p className="home-audience__swipe-hint">Swipe to explore more business types</p>
      </div>
    </section>
  );
};
