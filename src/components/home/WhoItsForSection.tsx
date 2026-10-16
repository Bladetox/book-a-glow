export const WhoItsForSection = () => {
  return (
    <section id="who-its-for" className="home-audience">
      <div className="home-audience__inner">
        <div className="home-audience__copy">
          <p className="home-audience__eyebrow">01 · Who it's for</p>
          <h2>Built for independent service businesses.</h2>
          <p>Beauty, barber, photography, tattoo, wellness and more. If you take bookings, NextSlot is for you.</p>
        </div>
        <div className="home-audience__visuals" aria-label="Examples of independent service businesses">
          <div className="home-audience__visual" role="img" aria-label="Beauty and wellness services">
            <span>Beauty & wellness<small>Bookings and client care</small></span>
          </div>
          <div className="home-audience__visual" role="img" aria-label="Barber and grooming services">
            <span>Barbers<small>Appointments and payments</small></span>
          </div>
          <div className="home-audience__visual" role="img" aria-label="Creative and mobile services">
            <span>Creative & mobile<small>Flexible, on-the-go work</small></span>
          </div>
        </div>
      </div>
    </section>
  );
};
