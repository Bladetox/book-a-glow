// A3 · SOLUTION AWARE — "Later". The viewer knows booking systems exist and files one under "my future self".
// System: the grid means months. "later" is cut; twelve months appear; the ten months already run on chats are cut away, nearest first.
// Then a week of appointments rotates 90° and stops: the same bookings read another way, as what they mean. The signal: "now" and the answer.
import { C, M, G, col, span, CW, E, seg, E8, E16, text, numeral, knife, note, rule, wipe, font } from './swiss.js';
export const RIGHT = 'Illustrative';
export const LINE = 'Start the record now. Thank yourself later.';
export const HL = /^(back\.?|now\.?)$/i;
const q = t => Math.round(t / E16) * E16;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function build(VO) {
  const T = VO.map(v => q(v.t0)), ev = [];
  const W6 = span(6);
  // month grid: 3 columns × 4 rows (each cell 2 grid columns wide)
  const MG = { y: 300, h: 150, gap: 24 }, cw = span(2);
  const cell = i => ({ x: col((i % 3) * 2), y: MG.y + Math.floor(i / 3) * (MG.h + MG.gap), w: cw, h: MG.h });
  const NOW = 10;
  // cut order: by distance from November, nearest first, two per sixteenth
  const order = [...Array(10).keys()].sort((a, b) => Math.abs(a - NOW) - Math.abs(b - NOW));
  const cutT = i => q(VO[2].t0 + .9 + order.indexOf(i) * E16 * 1.5);
  const PAN = T[4];                         // hard pan: the year leaves upward, the week arrives
  const ROT = q(T[5] + .1);                 // the week rotates 90° and stops
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], COUNT = [7, 3, 6, 8, 9, 11];   // illustrative bookings per day
  const metrics = [['Clients who came back', '62%'], ['Never returned after visit one', '9'], ['Quietest day', 'Tuesday']];
  const v4 = VO[3], mt = [0, .33, .63].map(f => q(v4.t0 + (v4.t1 - v4.t0) * f));
  ev.push({ t: T[0], type: 'thunk' }, { t: T[1], type: 'knife' }, { t: T[1] + .4, type: 'wipe' }, ...order.map(i => ({ t: cutT(i), type: 'knife' })),
    ...mt.map(t => ({ t, type: 'snap' })), { t: PAN, type: 'wipe' }, { t: ROT, type: 'rise' }, { t: ROT + .6, type: 'stamp' }, { t: T[6], type: 'snap' }, { t: T[7], type: 'tick' });

  function draw(g, t) {
    // "later", cut
    if (t >= T[0] - E8) knife(g, { x: M, y: 420, w: 800, h: 230 }, t, T[1], g2 => { numeral(g2, 'later', M, 620, 260, t, T[0]); note(g2, 'When I’m busier', M, 700, t, T[0] + .4); });
    // the year
    const pan = E(seg(t, PAN - E8, PAN + E8)) * -1400;
    g.save(); g.translate(0, pan);
    if (t >= T[1] + .3 && t < PAN + E8) {
      note(g, '2026', M, 262, t, T[1] + .3, { col: C.ink });
      MON.forEach((m, i) => {
        const c = cell(i), t0 = T[1] + .4 + i * E16 * .5;
        const drawCell = g2 => { wipe(g2, c.x, c.y, c.w, c.h, i >= NOW ? C.paper : C.paper, E(seg(t, t0 - E8, t0)), 'u');
          if (t >= t0) { text(g2, m, c.x + 22, c.y + 58, { t, tIn: t0, size: 40, wt: 700, col: i === NOW ? C.sig : C.ink }); if (i === NOW) note(g2, 'Now', c.x + 22, c.y + 122, t, t0 + E8, { col: C.sig }); } };
        if (i < NOW) { if (!knife(g, c, t, cutT(i), drawCell)) { g.strokeStyle = C.g2; g.lineWidth = 2; g.setLineDash([8, 8]); g.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2); g.setLineDash([]); text(g, m, c.x + 22, c.y + 58, { t: 99, tIn: 0, size: 40, wt: 700, col: C.g2 }); note(g, 'No record', c.x + 22, c.y + 122, t, cutT(i) + 2 * E8, { col: C.g2 }); } }
        else drawCell(g);
      });
    }
    g.restore();
    // the questions a record answers (unknown until the week is read)
    const known = t >= ROT + .6;
    metrics.forEach(([k, v], i) => { const y = 1060 + i * 92;
      rule(g, M, y - 52, W6, seg(t, mt[i] - E8, mt[i]), C.ink, 1.5);
      text(g, k, M, y, { t, tIn: mt[i], size: 38, wt: 600 });
      if (!known) text(g, '?', M + W6, y, { t, tIn: mt[i] + E8, size: 44, wt: 700, col: C.g2, align: 'right' });
      else text(g, v, M + W6, y, { t, tIn: ROT + .6 + i * E8, size: 44, wt: 700, col: i === 2 ? C.sig : C.ink, align: 'right' }); });
    // a week of appointments: bars in day columns; rotates 90° and stops, then reads as bookings per day
    if (t >= PAN) {
      const cx = 540, cy = 640, a = E(seg(t, ROT, ROT + 2 * E8)) * Math.PI / 2;
      const bw = 96, gap = 24, x0 = cx - (6 * bw + 5 * gap) / 2, base = cy + 260, unit = 44;
      g.save(); g.translate(cx, cy); g.rotate(a); g.translate(-cx, -cy);
      DAYS.forEach((d, k) => { const h = COUNT[k] * unit, x = x0 + k * (bw + gap), t0 = PAN + .2 + k * E16;
        wipe(g, x, base - h, bw, h, a > 1.5 && k === 1 ? C.sig : C.ink, E(seg(t, t0 - E8, t0)), 'u'); });
      g.restore();
      // labels only once the rotation has stopped (rotate, hold, then label)
      if (t >= ROT + 2 * E8 + .1) DAYS.forEach((d, k) => note(g, d, M, cy + (x0 + k * (bw + gap) + bw / 2 - cx) + 10, t, ROT + .5 + k * E16, { col: k === 1 ? C.sig : C.ink }));
      note(g, 'This week, bookings per day', M, 250, t, PAN + .3, { col: C.ink });
    }
    note(g, 'Record kept from booking 001', M, 1784, t, T[6] + .2, { col: C.sig, size: 23 });
  }
  const read = [['Quietest day Tuesday', ROT + .7, 25.6, M, 1200, M + W6, 1250]];
  return { draw, ev, read };
}
