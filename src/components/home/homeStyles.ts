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
  /* Persistent chapter rail: full-height on the left, outside the content flow. */
  .home-audience {
    background: #EDE4D7;
    padding: 64px 24px;
  }

  .home-audience__inner {
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    align-items: center;
    gap: clamp(28px, 5vw, 72px);
    width: min(1120px, 100%);
    margin-inline: auto;
  }

  .home-audience__copy { max-width: 560px; }

  .home-audience__visuals {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    align-items: stretch;
  }

  .home-audience__visual {
    position: relative;
    display: flex;
    align-items: flex-end;
    min-height: 148px;
    padding: 12px;
    overflow: hidden;
    background: linear-gradient(145deg, #F8F4ED, #E5D5C0);
    border: 1px solid rgba(126, 96, 58, .16);
  }

  .home-audience__visual:nth-child(2) {
    background: linear-gradient(155deg, #EEE4D7, #D9C5A9);
    margin-top: 18px;
  }

  .home-audience__visual:nth-child(3) {
    background: linear-gradient(145deg, #F7F1E8, #E8DCCB);
  }

  .home-audience__visual::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(245,240,231,0) 35%, rgba(66,48,27,.12) 100%);
  }

  .home-audience__visual::after {
    content: "";
    position: absolute;
    width: 42%;
    aspect-ratio: 1;
    top: 16%;
    right: 12%;
    border-radius: 50%;
    background: rgba(184, 139, 82, .12);
    filter: blur(22px);
  }

  .home-audience__visual span {
    position: relative;
    z-index: 1;
    color: #51483D;
    font-size: 10px;
    line-height: 1.25;
  }

  .home-audience__visual small {
    display: block;
    margin-top: 4px;
    color: #74695C;
    font-size: 9px;
  }

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

  .home-audience__copy > p:not(.home-audience__eyebrow),
  .home-pricing-preview__heading > p:not(.home-pricing-preview__eyebrow) {
    max-width: 560px;
    margin: 0;
    color: #51483D;
    font-size: 15px;
    line-height: 1.7;
  }

  .home-audience__copy .home-audience__eyebrow,
  .home-pricing-preview__heading .home-pricing-preview__eyebrow {
    margin: 0 0 14px;
    color: #94672F;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    line-height: 1.4;
    text-transform: uppercase;
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
    .home-audience { padding: 48px 20px 52px; }
    .home-audience__inner { grid-template-columns: minmax(0, 1fr); gap: 22px; }
    .home-audience__visuals { gap: 7px; }
    .home-audience__visual { min-height: 118px; padding: 8px; }
    .home-audience__visual:nth-child(2) { margin-top: 10px; }
    .home-audience__visual span { font-size: 9px; }
    .home-audience__visual small { font-size: 8px; }
    .home-audience__examples { gap: 6px 16px; }
    .home-pricing-preview { padding: 48px 16px 52px; }
    .home-pricing-preview__heading { text-align: left; margin-bottom: 20px; }
    .home-pricing-preview__grid { grid-template-columns: 1fr; gap: 0; }
    .home-pricing-preview__plan { padding: 20px 4px; }
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



  /* Keep the main story on one warm canvas, with a small number of deliberate chapter shifts. */
  .home-features,
  .home-revenue,
  .home-heatmap {
    background: #F5F0E7;
    padding: clamp(48px, 6vw, 76px) 24px;
  }

  .home-features__inner,
  .home-revenue > div,
  .home-heatmap > div {
    width: min(1120px, 100%);
    margin-inline: auto;
  }

  .home-features__texture { display: none; }

  .home-features__header {
    max-width: 720px;
    margin: 0 auto 34px;
    text-align: center;
  }

  .home-features__header h2 {
    margin: 0 0 14px;
    color: #000;
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 1.08;
    letter-spacing: -.03em;
  }

  .home-features__header h2 span { color: #94672F; }
  .home-features__header p { margin: 0; color: #51483D; font-size: 15px; line-height: 1.7; }

  .home-features__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 22px;
  }

  .home-features__card {
    min-width: 0;
    padding: 18px 0 0;
    border-top: 1px solid rgba(126, 96, 58, .25);
  }

  .home-features__stage {
    display: flex;
    gap: 12px;
    align-items: baseline;
    color: #51483D;
    font-size: 12px;
  }

  .home-features__stage span:first-child { color: #94672F; font-size: 10px; font-weight: 700; }
  .home-features__card h3 { margin: 0 0 10px; font-size: clamp(18px, 1.8vw, 22px); line-height: 1.22; color: #000; }
  .home-features__card h3 span { color: #94672F; }
  .home-features__card p { margin: 0; color: #51483D; font-size: 13px; line-height: 1.65; }

  .home-pricing-preview__eyebrow,
  .home-cta__eyebrow,
  .home-audience__eyebrow {
    margin: 0 0 14px;
    color: #94672F;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    line-height: 1.4;
    text-transform: uppercase;
  }

  .home-pricing-preview__eyebrow { text-align: center; }
  .home-cta__eyebrow { text-align: center; }

  /* Image slots preserve the agreed editorial rhythm until final product imagery is supplied. */
  .home-features__visual {
    position: relative;
    display: flex;
    align-items: flex-end;
    min-height: 148px;
    margin: 18px 0 20px;
    padding: 14px;
    overflow: hidden;
    border: 1px solid rgba(126, 96, 58, .18);
    border-radius: 10px;
    background:
      radial-gradient(ellipse at 78% 20%, rgba(184,139,82,.22), transparent 38%),
      linear-gradient(135deg, #F8F4ED 0%, #E8DCCB 100%);
  }

  .home-features__visual::before {
    content: "";
    position: absolute;
    inset: 16px 16px 34px;
    border: 1px solid rgba(126, 96, 58, .18);
    border-radius: 6px;
    background: rgba(255, 252, 247, .46);
  }

  .home-features__visual-label {
    position: relative;
    z-index: 1;
    color: #74695C;
    font: 500 10px Inter, sans-serif;
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .home-features__visual-lines {
    position: absolute;
    top: 32px;
    left: 30px;
    right: 30px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .home-features__visual-lines i {
    display: block;
    height: 5px;
    width: 76%;
    border-radius: 5px;
    background: rgba(126, 96, 58, .14);
  }

  .home-features__visual-lines i:nth-child(2) { width: 54%; }
  .home-features__visual-lines i:nth-child(3) { width: 66%; }

  .home-features__visual--see {
    background:
      radial-gradient(ellipse at 70% 35%, rgba(184,139,82,.20), transparent 36%),
      linear-gradient(135deg, #F4EEE5 0%, #E5D6C2 100%);
  }

  .home-features__visual--focus {
    background:
      radial-gradient(ellipse at 72% 24%, rgba(184,139,82,.26), transparent 38%),
      linear-gradient(135deg, #F8F4ED 0%, #E9DDCB 100%);
  }

  @media (max-width: 767px) {
    .home-features,
    .home-revenue,
    .home-heatmap { padding: 48px 16px 52px; }
    .home-features__grid { grid-template-columns: minmax(0, 1fr); gap: 28px; }
    .home-features__header { margin-bottom: 28px; text-align: left; }
    .home-features__visual { min-height: 124px; }
    .home-pricing-preview__eyebrow { text-align: left; }
  }


`;
