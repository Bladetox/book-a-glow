import "./Orb.css";

export const Orb = () => (
  <div className="nexty-orb" aria-hidden="true">
    <div className="nexty-orb__aura nexty-orb__aura--inner" />
    <div className="nexty-orb__aura nexty-orb__aura--middle" />
    <div className="nexty-orb__aura nexty-orb__aura--outer" />

    <div className="nexty-orb__ring nexty-orb__ring--outer" />
    <div className="nexty-orb__ring nexty-orb__ring--inner" />

    <div className="nexty-orb__core">
      <div className="nexty-orb__highlight" />
      <span className="nexty-orb__wordmark">nexty</span>
    </div>

    <div className="nexty-orb__particle nexty-orb__particle--one" />
    <div className="nexty-orb__particle nexty-orb__particle--two" />
    <div className="nexty-orb__particle nexty-orb__particle--three" />
  </div>
);
