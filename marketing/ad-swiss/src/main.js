// Page contract (Lemo-Opuscar): window.render(t), DUR, READY, EV, TEXTS. ?ad=a1…a5 picks the film; ?nosub=1 hides the subtitles.
import { C, W, H, frameNotes, subtitles, endCard } from './swiss.js';
const Q = new URLSearchParams(location.search), AD = Q.get('ad') || 'a1';
const cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['400', '500', '600', '700'].map(w => document.fonts.load(`${w} 40px IN`)).concat([document.fonts.load('800 40px MS')]));
const icon = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'nextslot-icon.png'; });
const { VO, END } = await import(`./vo_${AD}.js`);
const A = await import(`./${AD}.js`);
const scene = A.build(VO, END);
window.DUR = 30;
window.EV = scene.ev;
window.TEXTS = t => (scene.read || []).filter(r => t >= r[1] && t < r[2]).map(([text, , , x0, y0, x1, y1]) => ({ id: text, text, x0, y0, x1, y1 }));
window.render = t => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = C.page; g.fillRect(0, 0, W, H);
  scene.draw(g, t);
  frameNotes(g, t, A.RIGHT || '');
  if (!Q.has('nosub')) subtitles(g, t, VO.filter(v => !(A.CTA_LAST && v === VO[VO.length - 1])), { hl: A.HL });
  endCard(g, t, END, A.LINE, icon);
  // a line still being spoken when the end card arrives stays on top of it
  if (!Q.has('nosub') && t >= END) subtitles(g, t, VO.filter(v => v.t1 > END && !(A.CTA_LAST && v === VO[VO.length - 1])), { hl: A.HL });
};
window.READY = true;
