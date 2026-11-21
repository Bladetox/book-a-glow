// A1 · UNAWARE — "Busy isn't paid". The viewer doesn't know there's a problem: they assume their busiest service is their best earner.
// System: two columns, one per service. The grid means time: the tally blocks are bookings, the bars are rand per minute.
// The exception (signal colour): the lash lift's per-minute bar, which rises linearly past the line the gel overlay sets.
import { C, M, G, col, span, CW, E, seg, E8, E16, text, numeral, knife, caption, note, rule, wipe, font } from './swiss.js';
export const RIGHT = 'Example figures';
export const LINE = 'Know which service really pays.';
export const HL = /^(double\.?|best\.?)$/i;
const q = t => Math.round(t / E16) * E16;   // visual onsets on the sixteenth grid

export function build(VO) {
  const T = VO.map(v => q(v.t0));
  const L = col(0), R = col(3), CWID = span(3);
  const ev = [];
  // bookings: 12 gel overlays, 4 lash lifts (example month)
  const BW = 96, BH = 56, GAP = 12, BY = 340;
  const blocks = (x, n, t0) => [...Array(n)].map((_, k) => ({ x: x + (k % 4) * (BW + GAP), y: BY + Math.floor(k / 4) * (BH + GAP), t: t0 + .25 + k * E16 }));
  const left = blocks(L, 12, T[0]), right = blocks(R, 4, T[1]);
  left.concat(right).forEach(b => ev.push({ t: b.t, type: 'tick' }));
  const EQ = { x: 540 - 80, y: 630, w: 160, h: 60 };
  const PERMIN = T[5] + .6, BAR0 = 1316, U = 21;   // 22 px per rand per minute
  ev.push({ t: T[0], type: 'snap' }, { t: T[1], type: 'snap' }, { t: T[2], type: 'clack' }, { t: T[3], type: 'thunk' }, { t: T[4], type: 'thunk' },
    { t: PERMIN, type: 'wipe' }, { t: PERMIN + .5, type: 'rise' }, { t: T[5] + 1.6, type: 'knife' }, { t: T[6], type: 'snap' }, { t: T[7], type: 'stamp' });

  function draw(g, t) {
    // headers
    text(g, 'Gel overlay', L, 250, { t, tIn: T[0], size: 64, wt: 700 });
    note(g, 'Most booked', L, 300, t, T[0] + E8);
    text(g, 'Lash lift', R, 250, { t, tIn: T[1], size: 64, wt: 700 });
    note(g, 'Best paid?', R, 300, t, T[1] + E8, { col: C.sig });
    // tally blocks (snap in one per sixteenth)
    for (const b of left.concat(right)) { const p = E(seg(t, b.t - E16, b.t)); wipe(g, b.x, b.y, BW, BH, C.ink, p, 'u'); }
    // "=": the assumption, cut when the per-minute bars disagree
    if (t >= T[2] - E8) knife(g, { x: EQ.x, y: EQ.y - 30, w: EQ.w, h: 100 }, t, T[5] + 1.6, g2 => {
      const p = E(seg(t, T[2] - E8, T[2])); g2.fillStyle = C.ink; g2.fillRect(EQ.x, EQ.y - 30, EQ.w * p, 22); g2.fillRect(EQ.x + EQ.w * (1 - p), EQ.y + 18, EQ.w * p, 22);
    });
    note(g, 'The same?', 540, 712, t, T[2] + E8, { align: 'center', tOut: T[5] + 1.6 });
    // the facts: minutes and price
    const W1 = numeral(g, '60', L, 930, 230, t, T[3]); text(g, 'min', L + W1 + 16, 930, { t, tIn: T[3] + E8, size: 48, wt: 600, col: C.g3 });
    text(g, 'R320', L, 1030, { t, tIn: T[3] + .9, size: 92, wt: 700 });
    const W2 = numeral(g, '45', R, 930, 230, t, T[4]); text(g, 'min', R + W2 + 16, 930, { t, tIn: T[4] + E8, size: 48, wt: 600, col: C.g3 });
    text(g, 'R450', R, 1030, { t, tIn: T[4] + .9, size: 92, wt: 700 });
    // per minute: rand per minute as bars from the baseline at 1296
    if (t >= PERMIN - E8) {
      rule(g, M, BAR0, span(6), seg(t, PERMIN - E8, PERMIN), C.ink, 2);
      const hL = 5.33 * U, hR = 10 * U;
      wipe(g, L, BAR0 - hL, CWID, hL, C.ink, E(seg(t, PERMIN, PERMIN + E8)), 'u');
      // the exception: linear, unsnapped, past the gel overlay's line
      const pr = seg(t, PERMIN + .5, PERMIN + 1.3); wipe(g, R, BAR0 - hR, CWID, hR, C.sig, pr, 'u');
      text(g, 'R5.33 / min', L, BAR0 - hL - 22, { t, tIn: PERMIN + .2, size: 46, wt: 700 });
      text(g, 'R10.00 / min', R, BAR0 - hR - 22, { t, tIn: PERMIN + 1.3, size: 46, wt: 700 });
    }
    // which fills your week: the hours each service takes
    note(g, '12 × 60 min = 12 hours', L, 578, t, T[6] + .1, { col: C.ink });
    note(g, '4 × 45 min = 3 hours', R, 446, t, T[6] + .3, { col: C.ink });
    // the source of the number
    note(g, 'Revenue per minute: Nexty insights, Professional plan', M, 1784, t, T[7] + .2, { size: 23 });
  }
  const read = [['R10.00 / min', T[5] + 1.6, VO[7].hold, R, 1000, R + 300, 1060], ['12 × 60 min = 12 hours', T[6] + .2, 25.6, L, 540, L + 420, 566]];
  return { draw, ev, read };
}
