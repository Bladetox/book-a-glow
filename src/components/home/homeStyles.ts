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

  /* Nexty AI section orb */
  @keyframes orbBgPulse    { 0%,100%{opacity:.6;transform:scale(1);}     50%{opacity:1;transform:scale(1.1);} }
  @keyframes nextyOrbit    { to{transform:rotate(360deg);}  }
  @keyframes nextyOrbitR   { to{transform:rotate(-360deg);} }
  @keyframes nextyDot1     { from{transform:rotate(0deg)   translateX(84px) rotate(0deg);}   to{transform:rotate(360deg)  translateX(84px) rotate(-360deg);}  }
  @keyframes nextyDot2     { from{transform:rotate(180deg) translateX(66px) rotate(-180deg);} to{transform:rotate(540deg)  translateX(66px) rotate(-540deg);}  }

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
`;
