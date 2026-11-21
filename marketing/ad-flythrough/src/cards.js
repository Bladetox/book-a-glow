// Card art drawn with Canvas 2D: paper, one ink, one accent, mono labels. Logical size in px (1000 px = 1 world unit), canvases at 2×.
// COL is this film's palette: warm cream paper and NextSlot bronze for what matters now; green only for "paid / confirmed", red only for failure.
import { hash } from '/core/lib.js';
export const COL = {
  paper: '#ebe5da', card: '#fdfbf7', dot: '#d3c9b8', ink: '#1e1a16', mute: '#7d7266', line: '#e9e1d3', faint: '#f4efe6',
  accent: '#a87a3f', accentDk: '#7f5a2b', gold: '#d4a574', red: '#d9483b', green: '#2e7d4f', night: '#1b1712', nightInk: '#efe7da', nightMute: '#9a8f80',
};
export const MONO = 'IN, sans-serif', SANS = 'MS, sans-serif', BODY = 'IN, sans-serif', CJK = BODY;

export function canvas(w, h, s = 2) {
  const c = document.createElement('canvas'); c.width = w * s; c.height = h * s;
  const x = c.getContext('2d'); x.scale(s, s); return [c, x];
}
export const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
export function txt(c, s, x, y, o = {}) {
  c.font = `${o.wt || 500} ${o.size || 20}px ${o.font || MONO}`; c.fillStyle = o.col || COL.ink;
  c.textAlign = o.align || 'left'; c.textBaseline = 'middle';
  c.letterSpacing = (o.ls || 0) + 'px'; c.fillText(s, x, y); c.letterSpacing = '0px';
  return c.measureText(s).width;
}
// mono section label: accent square + spaced caps
export function tag(c, s, x, y, size = 18, col = COL.accent, ink = COL.ink) {
  c.fillStyle = col; c.fillRect(x, y - size * .45, size * .9, size * .9);
  txt(c, s.toUpperCase(), x + size * 1.5, y + 1, { size, col: ink, wt: 600, ls: size * .2 });
}
// fine paper grain, deterministic (so every render of a card is the same)
export function grain(c, w, h, seed = 1, n = null, dark = 'rgba(51,40,28,.035)', light = 'rgba(255,255,255,.5)') {
  n = n || Math.round(w * h / 55);
  for (let i = 0; i < n; i++) {
    const x = hash(i * 1.37 + seed) * w, y = hash(i * 2.11 + seed * 3.7) * h, r = .6 + hash(i * 5.3 + seed) * 1.1;
    c.fillStyle = hash(i * 7.7 + seed) < .5 ? dark : light; c.fillRect(x, y, r, r);
  }
}
// card face: near-white, thin rule, a two-line head (English mono caps over a Chinese bold line)
export function cardBase(c, w, h, en, cn, o = {}) {
  const bg = o.bg || COL.card, ink = o.ink || COL.ink, sub = o.sub || COL.mute;
  c.clearRect(0, 0, w, h);
  c.fillStyle = bg; rr(c, 0, 0, w, h, 16); c.fill();
  c.save(); rr(c, 0, 0, w, h, 16); c.clip(); grain(c, w, h, w * .37 + h, null, o.dark ? 'rgba(0,0,0,.08)' : undefined, o.dark ? 'rgba(255,255,255,.03)' : undefined); c.restore();
  c.strokeStyle = o.rule || COL.line; c.lineWidth = 3; rr(c, 1.5, 1.5, w - 3, h - 3, 15); c.stroke();
  if (en) {
    tag(c, en, 28, 34, o.tagSize || 17, o.tagCol || COL.accent, ink);
    if (cn) txt(c, cn, 28, 66, { size: o.cnSize || 21, wt: 700, font: CJK, col: sub });
    c.fillStyle = o.rule || COL.line; c.fillRect(20, o.headH || 90, w - 40, 2);
  }
}
// the paper's dot texture: a tile of n×n dots with a faint grain (the tile repeats every n dots)
export function dotTile(px = 1024, n = 8, r = 6.5) {
  const [c, x] = canvas(px, px, 1);
  x.fillStyle = COL.paper; x.fillRect(0, 0, px, px);
  grain(x, px, px, 7, 26000, 'rgba(51,40,28,.025)', 'rgba(255,255,255,.22)');
  const st = px / n;
  x.fillStyle = COL.dot;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.beginPath(); x.arc((i + .5) * st, (j + .5) * st, r, 0, 7); x.fill(); }
  return c;
}
// a hand-set tick (✓) and cross (✗), stroked
export function tick(c, x, y, s, col, lw = 6) {
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - s * .45, y); c.lineTo(x - s * .12, y + s * .32); c.lineTo(x + s * .5, y - s * .38); c.stroke();
}
export function cross(c, x, y, s, col, lw = 6) {
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - s / 2, y - s / 2); c.lineTo(x + s / 2, y + s / 2); c.moveTo(x + s / 2, y - s / 2); c.lineTo(x - s / 2, y + s / 2); c.stroke();
}
