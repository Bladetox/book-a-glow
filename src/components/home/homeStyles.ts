/* ─── Home page global keyframes + carousel CSS ──────────────── */
/* Injected once via <style> in Index.tsx                         */

const homeStyles = `
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
  @keyframes fillBar       { from{width:0;} to{width:var(--bar-w,0%);} }
  @keyframes shimmer       { 0%{background-position:200% center;} 100%{background-position:-200% center;} }
  @keyframes compareFadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

  /* ── feat-carousel (mobile horizontal scroll) ── */
  .feat-carousel {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    perspective: 800px;
  }
  .feat-carousel::-webkit-scrollbar { display: none; }
  .feat-carousel > * {
    flex-shrink: 0;
    scroll-snap-align: center;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
  .feat-carousel > *.edge-left  { opacity: 0.45; }
  .feat-carousel > *.edge-right { opacity: 0.45; }
  .feat-carousel > *.active-card { opacity: 1; }

  /* ── proof ticker ── */
  .proof-track {
    display: flex;
    gap: 0;
    animation: proofScroll 28s linear infinite;
    will-change: transform;
  }
  .proof-track:hover { animation-play-state: paused; }

  /* ── comparison row fade ── */
  .compare-row {
    animation: compareFadeIn 0.4s ease both;
  }
`;

export default homeStyles;
