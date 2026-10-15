export const WhoItsForSection = () => {
  return (
    <section id="who-its-for" className="home-audience">
      <div className="home-audience__inner">
        <div className="home-audience__copy">
          <h2>Built for independent service businesses.</h2>
          <p>Whether clients come to you or you travel to them, NextSlot brings your bookings and business activity into one place.</p>
        </div>
        <div className="home-audience__examples" aria-label="Examples of independent service businesses">
          {["Beauty & wellness", "Barbers", "Photographers", "Tattoo artists", "Mobile services"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
};
