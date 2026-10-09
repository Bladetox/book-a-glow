/* ─── All @keyframes and carousel CSS injected once by Index.tsx ─ */
export const HOME_STYLES = `
  @keyframes fadeUp        { from{opacity:0;transform:translateY(14px);}  to{opacity:1;transform:translateY(0);} }
  @keyframes fadeSlideIn   { from{opacity:0;transform:translateX(16px);}  to{opacity:1;transform:translateX(0);} }
  @keyframes bubbleIn      { from{opacity:0;transform:translateX(-12px) scale(0.96);} to{opacity:1;transform:translateX(0) scale(1);} }
  @keyframes orbAuraPulse  { 0%,100%{opacity:.5;transform:scale(1);}      50%{opacity:1;transform:scale(1.1);} }
  @keyframes orbSpinA      { to{transform:rotate(360deg);}  }
  @keyframes orbSpinB      { to{transform:rotate(-360deg);} }
  @keyframes orbBreathe    { 0%,100%{transform:scale(1);filter:brightness(1);}  50%{transform:scale(1.06);filter:brightness(1.14);} }
  @keyframes dotOrbitA     { from{transform:rotate(0deg)   translateX(var(--orb-tx,93px)) rotate(0deg);}    to{transform:rotate(360deg)  translateX(var(--orb-tx,93px)) rotate(-360deg);}  }
  @keyframes dotOrbitBm    { from{transform:rotate(70deg)  translateX(var(--orb-tx,71px)) rotate(-70deg);}  to{transform:rotate(430deg)  translateX(var(--orb-tx,71px)) rotate(-430deg);}  }
  @keyframes dotOrbitC     { from{transform:rotate(200deg) translateX(var(--orb-tx,93px)) rotate(-200deg);} to{transform:rotate(560deg)  translateX(var(--orb-tx,93px)) rotate(-560deg);}  }
  @keyframes heroBreathe   { 0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1);}  50%{opacity:1;transform:translate(-50%,-50%) scale(1.12);} }
  @keyframes proofScroll   { 0%{transform:translateX(0);}  100%{transform:translateX(-50%);} }
  @keyframes pulseDot      { 0%,100%{opacity:1;transform:scale(1);}  50%{opacity:.4;transform:scale(.65);} }
  @keyframes fillBar       { from{width:0;} to{width:var(--bar-w,60%);} }
  @keyframes countUp       { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
  @keyframes shimmer       { 0%{background-position:-200% 0;} 100%{background-position:200% 0;} }

  @keyframes orbBgPulse    { 0%,100%{opacity:.6;transform:scale(1);}     50%{opacity:1;transform:scale(1.1);}  }
  @keyframes nextyOrbit    { to{transform:rotate(360deg);}  }
  @keyframes nextyOrbitR   { to{transform:rotate(-360deg);} }
  @keyframes nextyDot1     { from{transform:rotate(0deg)   translateX(84px) rotate(0deg);}   to{transform:rotate(360deg)  translateX(84px) rotate(-360deg);}  }
  @keyframes nextyDot2     { from{transform:rotate(180deg) translateX(66px) rotate(-180deg);} to{transform:rotate(540deg)  translateX(66px) rotate(-540deg);}  }

  .marketing-site {
    text-rendering: optimizeLegibility;
  }

  .marketing-site h1,
  .marketing-site h2,
  .marketing-site h3 {
    text-wrap: balance;
  }

  .marketing-site p {
    text-wrap: pretty;
  }

  .marketing-site a {
    transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
  }

  .marketing-site a:focus-visible {
    outline: 2px solid #D4A574;
    outline-offset: 4px;
  }

  .marketing-site ::selection {
    background: rgba(184,139,82,0.24);
    color: #000000;
  }

  .marketing-site .surface {
    background: #EDE4D7;
    border: 1px solid rgba(126,96,58,0.16);
  }

  .marketing-site .surface-elevated {
    background: #E8D6B9;
    border: 1px solid rgba(126,96,58,0.24);
    box-shadow: 0 12px 32px rgba(66,48,27,0.10);
  }

  .marketing-site .section-copy {
    max-width: 560px;
  }

  .marketing-site .content-width {
    width: min(1120px, calc(100% - 48px));
    margin-inline: auto;
  }

  .feat-carousel {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    gap: 12px;
    padding: 0 24px 16px;
    scrollbar-width: none;
    perspective: 800px;
  }
  .feat-carousel::-webkit-scrollbar { display: none; }
  .feat-carousel > * {
    scroll-snap-align: center;
    flex-shrink: 0;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }
  .feat-carousel > *.edge-left  { opacity: 0.45; }
  .feat-carousel > *.edge-right { opacity: 0.45; }
  .feat-carousel > *.active-card { opacity: 1; }

  .proof-track { animation: proofScroll 28s linear infinite; }
  .proof-track:hover { animation-play-state: paused; }

  @media (prefers-reduced-motion: reduce) {
    .marketing-site *,
    .marketing-site *::before,
    .marketing-site *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }

    .proof-track {
      animation: none !important;
    }
  }

  .demo-devices-desktop { display: flex; }
  .demo-devices-mobile  { display: none; }

  @media (max-width: 767px) {
    .demo-devices-desktop { display: none !important; }
    .demo-devices-mobile  { display: flex !important; }

    .demo-tips-grid {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }
  }

  @media (max-width: 767px) {
    .pricing-hero-grid {
      grid-template-columns: 1fr !important;
      gap: 32px !important;
    }
    .pricing-plans-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .starter-callout-grid {
      grid-template-columns: 1fr !important;
      gap: 20px !important;
    }
    .pricing-steps-row {
      display: none !important;
    }
  }

  @media (max-width: 767px) {
    .about-hero-grid {
      grid-template-columns: 1fr !important;
      gap: 32px !important;
    }
    .about-belief-card {
      padding: 24px !important;
      border-radius: 16px !important;
    }
    .about-belief-card .belief-quote {
      font-size: 18px !important;
    }
    .about-belief-card .belief-stats-grid {
      grid-template-columns: 1fr 1fr !important;
      gap: 12px !important;
    }
  }
`;
