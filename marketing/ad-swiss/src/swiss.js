// Swiss Motion engine for the NextSlot "levels of awareness" ads: vertical 1080×1920, one family (Inter), paper, ink, greys, one signal colour.
// Rules (STYLE.md): everything on the grid; two curves only (precise ease E and linear); entrances are wipes or clip-reveals, never fades;
// deletions are knife cuts; nothing bounces. Subtitles are part of the layout (a bold statement at a column start, words clip-revealed).
import { E, seg, clamp, lerp, snap, BEAT, E8, E16 } from './ease.js';
export { E, seg, clamp, lerp, snap, BEAT, E8, E16 };

export const W = 1080, H = 1920;
export const C = { page: '#ECEAE4', paper: '#FFFFFF', ink: '#111111', g1: '#DAD7D0', g2: '#BDB9B0', g3: '#8C877D', sig: '#E2541B' };
export const F = 'IN';
// grid: 6 columns, 72 px margins, 24 px gutters, 24 px baseline
export const M = 72, G = 24, COLS = 6, CW = (W - 2 * M - (COLS - 1) * G) / COLS;
export const col = i => M + i * (CW + G);
export const span = n => n * CW + (n - 1) * G;
export const BL = 24;
export const AREA = { y0: 168, y1: 1320 };          // the picture's zone; the subtitles live below it
export const SUB = { y: 1452, size: 62, lh: 74 };

export const font = (g, size, wt = 700, ls = null) => { g.font = `${wt} ${size}px ${F}`; g.letterSpacing = (ls ?? (size >= 90 ? -size * .02 : 0)) + 'px'; };

// a rect revealed by a wipe from one side ('l','r','u','d'); p 0..1
export function wipe(g, x, y, w, h, col, p, dir = 'l') {
  if (p <= 0) return; p = Math.min(1, p); g.fillStyle = col;
  if (dir === 'l') g.fillRect(x, y, w * p + .5, h); else if (dir === 'r') g.fillRect(x + w * (1 - p), y, w * p + .5, h);
  else if (dir === 'u') g.fillRect(x, y + h * (1 - p), w, h * p + .5); else g.fillRect(x, y, w, h * p + .5);
}
// a hairline that grows along its length (linear)
export function rule(g, x, y, w, p, col = C.ink, lw = 2) { if (p <= 0) return; g.fillStyle = col; g.fillRect(x, y, w * Math.min(1, p), lw); }

// text clip-revealed from below its baseline (in), leaving upward (out). Words stagger by one sixteenth.
// opts: {size, wt, col, tIn, tOut, stagger, dur, align:'left'|'right', maxW, lh, words:[t...]} → returns the height used
export function text(g, s, x, y, o) {
  const size = o.size ?? 40, wt = o.wt ?? 700, lh = o.lh ?? Math.round(size * 1.12), dur = o.dur ?? E8;
  font(g, size, wt, o.ls);
  const lines = wrap(g, s, o.maxW ?? 1e9);
  let k = 0, used = 0;
  lines.forEach((ln, li) => {
    const ly = y + li * lh; let cx = x;
    if (o.align === 'right') cx = x - g.measureText(ln.join(' ')).width;
    for (const wd of ln) {
      const t0 = o.words ? o.words[k] : (o.tIn ?? 0) + k * (o.stagger ?? E16);
      const pin = E(seg(o.t, t0, t0 + dur)), pout = o.tOut != null ? E(seg(o.t, o.tOut, o.tOut + dur)) : 0;
      const ww = g.measureText(wd).width, sp = g.measureText(' ').width;
      if (pin > 0 && pout < 1) {
        g.save(); g.beginPath(); g.rect(cx - 4, ly - size * 1.0, ww + 8, size * 1.3); g.clip();
        g.fillStyle = typeof o.col === 'function' ? o.col(wd, k) : (o.col ?? C.ink); g.textBaseline = 'alphabetic';
        g.fillText(wd, cx, ly + (1 - pin) * size * 1.15 - pout * size * 1.15); g.restore();
      }
      cx += ww + sp; k++;
    }
    used = (li + 1) * lh;
  });
  return used;
}
export function wrap(g, s, maxW) {
  const words = s.split(' '), lines = [[]];
  for (const w of words) { const cur = lines[lines.length - 1]; const test = [...cur, w].join(' '); if (cur.length && g.measureText(test).width > maxW) lines.push([w]); else cur.push(w); }
  return lines;
}
// a giant numeral that climbs in eased steps ("one module at a time"), optically flush left
export function numeral(g, s, x, y, size, t, tIn, col = C.ink, tOut = null) {
  font(g, size, 700); g.textBaseline = 'alphabetic';
  const m = g.measureText(s), bear = m.actualBoundingBoxLeft ? -m.actualBoundingBoxLeft : 0;
  const steps = 3, p = seg(t, tIn, tIn + E8 * steps) * steps, i = Math.floor(p), pin = i >= steps ? 1 : (i + E(p - i)) / steps;
  const pout = tOut != null ? E(seg(t, tOut, tOut + E8)) : 0;
  if (pin <= 0 || pout >= 1) return m.width;
  g.save(); g.beginPath(); g.rect(x - 20, y - size * .78, m.width + 40, size * .82); g.clip();
  g.fillStyle = col; g.fillText(s, x - bear, y + (1 - pin) * size * .8 - pout * size * .8); g.restore();
  return m.width;
}
// knife cut: a thin line crosses the box (linear, one eighth), then the box collapses to its midline (precise ease, one eighth).
// draw(g) draws the element; returns false once it is gone
export function knife(g, box, t, tc, draw, lineCol = C.sig) {
  const { x, y, w, h } = box;
  if (t < tc) { draw(g); return true; }
  const a = seg(t, tc, tc + E8), b = E(seg(t, tc + E8, tc + 2 * E8));
  if (b >= 1) return false;
  g.save(); const my = y + h / 2; g.translate(0, my); g.scale(1, 1 - b); g.translate(0, -my); draw(g); g.restore();
  if (b < .6) { g.fillStyle = lineCol; g.fillRect(x - 12, my - 1.5, (w + 24) * a, 3); }
  return true;
}
// small caption with a 1 px rule above (museum label)
export function caption(g, s, x, y, w, t, tIn, o = {}) {
  rule(g, x, y - 30, w, seg(t, tIn - E8, tIn + E8), o.ruleCol ?? C.ink, 1.5);
  text(g, s, x, y, { t, tIn, size: o.size ?? 24, wt: o.wt ?? 500, col: o.col ?? C.ink, maxW: w, tOut: o.tOut, lh: o.lh });
}
// spaced caps note
export function note(g, s, x, y, t, tIn, o = {}) { text(g, s.toUpperCase(), x, y, { t, tIn, size: o.size ?? 27, wt: 600, col: o.col ?? C.g3, ls: 3, align: o.align, tOut: o.tOut }); }

// the subtitles as layout: a small grey index, then the line as a large bold statement, words clip-revealed on estimated word times
export function subtitles(g, t, VO, o = {}) {
  for (let i = 0; i < VO.length; i++) {
    const v = VO[i]; if (t < v.t0 - .15 || t > v.hold + E8 + .02) continue;
    const words = v.sub.split(' '), letters = words.map(w => w.replace(/[^\w]/g, '').length + 1), tot = letters.reduce((a, b) => a + b, 0);
    let acc = 0; const wt = words.map(w => { const r = v.t0 - .12 + (v.t1 - v.t0) * acc / tot; acc += letters[words.indexOf(w)] ?? 0; return r; });
    acc = 0; for (let k = 0; k < words.length; k++) { wt[k] = v.t0 - .12 + (v.t1 - v.t0) * acc / tot; acc += letters[k]; }
    const y = o.y ?? SUB.y;
    note(g, String(i + 1).padStart(2, '0'), M, y - 78, t, v.t0 - .15, { tOut: v.hold, col: C.g3 });
    text(g, v.sub, M, y, { t, words: wt, size: o.size ?? SUB.size, lh: SUB.lh, wt: 700, maxW: span(6), tOut: v.hold, col: o.col ?? ((w) => (o.hl && o.hl.test(w)) ? C.sig : C.ink) });
  }
}

// the top bar: a brand note left, a technical note right, a rule; the bottom rule with the address
export function frameNotes(g, t, right = '', o = {}) {
  rule(g, M, 124, span(6), seg(t, 0, .4), C.ink, 2);
  note(g, 'NextSlot', M, 104, t, .05, { col: C.ink, size: 26 });
  if (right) note(g, right, W - M, 104, t, .15, { align: 'right', size: 26 });
  rule(g, M, 1820, span(6), seg(t, .1, .5), C.g2, 1.5);
  note(g, o.foot ?? 'nextslot.co.za', M, 1862, t, .2);
}

// the end card: paper wipes up over the page, the icon and wordmark snap in, the line and the address
export function endCard(g, t, T0, line, icon) {
  if (t < T0 - E8) return;
  const p = E(seg(t, T0 - E8, T0 + E8));
  g.fillStyle = C.paper; g.fillRect(0, H * (1 - p), W, H * p);
  if (p < 1) return;
  const y0 = 760;
  // icon wipes in from the left, the wordmark rises, a signal bar draws under it
  const ip = E(seg(t, T0 + E8, T0 + 2 * E8));
  if (ip > 0) { g.save(); g.beginPath(); g.rect(M, y0 - 200, 200 * ip, 200); g.clip(); g.drawImage(icon, M, y0 - 196, 192, 192); g.restore(); }
  // the wordmark is the brand's logo (Montserrat, two-tone), the one place another face appears
  const wp = E(seg(t, T0 + 2 * E8, T0 + 3 * E8));
  if (wp > 0) {
    g.save(); g.beginPath(); g.rect(M + 210, y0 - 170, 760, 180); g.clip();
    g.font = `800 132px MS`; g.letterSpacing = '-5px'; g.textBaseline = 'alphabetic';
    const dy = (1 - wp) * 150; g.fillStyle = '#000'; g.fillText('Next', M + 216, y0 - 40 + dy); const nw = g.measureText('Next').width; g.fillStyle = '#B88B52'; g.fillText('Slot', M + 216 + nw - 4, y0 - 40 + dy); g.restore();
  }
  rule(g, M, y0 + 40, span(6), seg(t, T0 + 3 * E8, T0 + 5 * E8), C.ink, 3);
  text(g, line, M, y0 + 170, { t, tIn: T0 + 4 * E8, size: 76, wt: 700, maxW: span(6), lh: 86 });
  wipe(g, M, y0 + 380, span(4), 112, C.sig, E(seg(t, T0 + 7 * E8, T0 + 8 * E8)), 'l');
  text(g, 'Start free at nextslot.co.za', M + 32, y0 + 452, { t, tIn: T0 + 8 * E8, size: 44, wt: 700, col: C.ink, maxW: span(4) });
  note(g, 'No payment to start · Cancel any time', M, y0 + 560, t, T0 + 9 * E8, { col: C.g3 });
}

// sound events helper: ev.push({t, type})
export const evs = [];
