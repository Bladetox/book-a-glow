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
  /* Homepage journey index and editorial chapter layout */
  .marketing-site [id="who-its-for"],
  .marketing-site [id="how-nextslot-works"],
  .marketing-site [id="results"],
  .marketing-site [id="pricing-preview"],
  .marketing-site [id="get-started"] {
    scroll-margin-top: 132px;
  }

  /* Fixed right-side journey index, visible while the page scrolls. */
  .home-journey-nav {
    position: fixed;
    top: 50%;
    right: clamp(12px, 2vw, 28px);
    z-index: 80;
    width: 164px;
    transform: translateY(-50%);
    background: rgba(245, 240, 231, 0.94);
    border: 1px solid rgba(126, 96, 58, 0.20);
    border-radius: 14px;
    box-shadow: 0 12px 34px rgba(66, 48, 27, 0.10);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }

  .home-journey-nav__inner {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 8px;
  }

  .home-journey-nav__link {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 42px;
    padding: 0 9px;
    color: #51483D;
    font-size: 12px;
    line-height: 1.2;
    text-decoration: none;
    white-space: nowrap;
    border-radius: 8px;
  }

  .home-journey-nav__number {
    color: #94672F;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .04em;
    flex: 0 0 auto;
  }

  .home-journey-nav__link.is-active {
    color: #000;
    font-weight: 600;
    background: rgba(184, 139, 82, 0.12);
  }

  .home-journey-nav__link:focus-visible {
    outline: 2px solid #B88B52;
    outline-offset: 2px;
  }

  .home-audience {
    background: #EDE4D7;
    padding: 64px 24px;
  }

  .home-audience__inner {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(260px, .9fr);
    align-items: center;
    gap: clamp(32px, 7vw, 100px);
    width: min(1120px, 100%);
    margin-inline: auto;
  }

  .home-audience__copy { max-width: 620px; }

  .home-audience__copy h2,
  .home-pricing-preview__heading h2 {
    margin: 0 0 14px;
    color: #000;
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(28px, 3.2vw, 42px);
    font-weight: 700;
    letter-spacing: -.03em;
    line-height: 1.12;
  }

  .home-audience__copy p,
  .home-pricing-preview__heading p {
    max-width: 560px;
    margin: 0;
    color: #51483D;
    font-size: 15px;
    line-height: 1.7;
  }

  .home-audience__examples {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 18px;
    align-content: center;
    color: #51483D;
    font-size: 13px;
    line-height: 1.5;
  }

  .home-audience__examples span {
    padding: 7px 0;
    border-bottom: 1px solid rgba(126, 96, 58, .24);
  }

  .home-pricing-preview {
    background: #EDE4D7;
    padding: 64px 24px 68px;
  }

  .home-pricing-preview__inner {
    width: min(1120px, 100%);
    margin-inline: auto;
  }

  .home-pricing-preview__heading {
    max-width: 620px;
    margin: 0 auto 32px;
    text-align: center;
  }

  .home-pricing-preview__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .home-pricing-preview__plan {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 24px;
    border-top: 1px solid rgba(126, 96, 58, .28);
    border-bottom: 1px solid rgba(126, 96, 58, .16);
  }

  .home-pricing-preview__plan h3 {
    margin: 0 0 12px;
    color: #000;
    font-family: 'Montserrat', sans-serif;
    font-size: 18px;
    font-weight: 700;
  }

  .home-pricing-preview__price {
    margin: 0 0 12px;
    color: #000;
    font-family: 'Montserrat', sans-serif;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -.03em;
  }

  .home-pricing-preview__price span {
    color: #51483D;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
  }

  .home-pricing-preview__description {
    flex: 1;
    margin: 0 0 18px;
    color: #51483D;
    font-size: 13px;
    line-height: 1.65;
  }

  .home-pricing-preview__trial {
    margin: 0;
    color: #74695C;
    font-size: 11px;
    line-height: 1.5;
  }

  .home-pricing-preview__footer {
    display: flex;
    justify-content: center;
    margin-top: 28px;
  }

  @media (max-width: 767px) {
    .home-journey-nav {
      top: auto;
      right: 8px;
      bottom: max(16px, env(safe-area-inset-bottom));
      width: 132px;
      transform: none;
      border-radius: 12px;
    }
    .home-journey-nav__inner { padding: 5px; }
    .home-journey-nav__link {
      min-height: 36px;
      gap: 7px;
      padding: 0 7px;
      font-size: 10px;
    }
    .home-journey-nav__number { font-size: 9px; }
    .home-audience { padding: 48px 20px 52px; }
    .home-audience__inner { grid-template-columns: minmax(0, 1fr); gap: 20px; }
    .home-audience__examples { gap: 6px 16px; }
    .home-pricing-preview { padding: 48px 16px 52px; }
    .home-pricing-preview__heading { text-align: left; margin-bottom: 20px; }
    .home-pricing-preview__grid { grid-template-columns: 1fr; gap: 0; }
    .home-pricing-preview__plan { padding: 20px 4px; }
    .marketing-site [id="who-its-for"],
    .marketing-site [id="how-nextslot-works"],
    .marketing-site [id="results"],
    .marketing-site [id="pricing-preview"],
    .marketing-site [id="get-started"] { scroll-margin-top: 24px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-journey-nav__link::after { transition: none; }
  }

  /* Guided homepage reveal: the hero and proof ticker remain untouched. */
  .home-journey-reveal {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    visibility: hidden;
    transition: grid-template-rows 420ms ease, opacity 260ms ease, visibility 0s linear 420ms;
  }

  .home-journey-reveal__content {
    min-height: 0;
    overflow: hidden;
    background: #F5F0E7;
  }

  .home-journey-reveal.is-active {
    grid-template-rows: 1fr;
    opacity: 1;
    visibility: visible;
    transition: grid-template-rows 420ms ease, opacity 260ms ease;
  }

  .home-journey-reveal.is-active .home-journey-reveal__content {
    overflow: visible;
  }

  .home-pricing-preview__plan.is-coming-soon {
    background: rgba(126, 96, 58, 0.035);
  }

  .home-pricing-preview__plan.is-coming-soon .home-pricing-preview__trial {
    font-weight: 600;
    color: #94672F;
  }

  @media (min-width: 768px) and (max-width: 1100px) {
    .home-pricing-preview__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .home-pricing-preview__plan { padding: 22px; }
  }

  @media (max-width: 767px) {
    .home-journey-reveal__content { overflow: hidden; }
    .home-journey-reveal.is-active .home-journey-reveal__content { overflow: visible; }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-journey-reveal,
    .home-journey-reveal.is-active {
      transition: none;
    }
  }

`;
