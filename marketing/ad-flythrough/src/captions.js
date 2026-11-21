// Subtitles (DOM, always crisp): one cue per voice-over line, English only, in a quiet ink bar near the bottom of the vertical frame.
// No sign-off: the film ends on the title card in the world. texts() reports nothing (subtitle cues are timed by the voice).
import { seg, eo } from '/core/lib.js';

export function makeSubs(VO, END) {
  const host = document.getElementById('sub'), line = host.querySelector('.en');
  let cur = -2;
  const clean = new URLSearchParams(location.search).has('nosub');
  function render(t) {
    if (clean) { host.style.display = 'none'; return; }
    let i = -1; for (let k = 0; k < VO.length; k++) { const next = VO[k + 1] ? VO[k + 1].t0 - .12 : END.subEnd; if (t >= VO[k].t0 - .12 && t < Math.min(next, Math.max(VO[k].t1 + .6, VO[k].t0 + 1.8))) i = k; }
    if (i !== cur) { cur = i; if (i >= 0) line.textContent = VO[i].en; }
    if (i >= 0) { const hold = Math.max(VO[i].t1 + .6, VO[i].t0 + 1.8); const a = Math.min(eo(seg(t, VO[i].t0 - .12, VO[i].t0 + .05)), 1 - seg(t, hold - .15, hold)); host.style.opacity = a; host.style.display = 'flex'; }
    else host.style.display = 'none';
  }
  return { render, texts: () => [] };
}
