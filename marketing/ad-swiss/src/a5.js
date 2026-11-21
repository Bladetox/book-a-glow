// A5 · MOST AWARE — "The deal". The viewer knows NextSlot and only needs the terms.
// System: a price list on the grid (four rows, one per plan), then a hard pan to a 30-cell grid where each cell is a trial day.
// The signal colour: "No payment to start", then the thirtieth day.
import { C, M, col, span, CW, G, E, seg, E8, E16, text, numeral, knife, note, rule, wipe } from './swiss.js';
export const RIGHT = 'Plans · per month';
export const LINE = 'Try it on your real bookings.';
export const HL = /^(free\.?|start\.?)$/i;
export const CTA_LAST = true;
const q = t => Math.round(t / E16) * E16;

export function build(VO, END) {
  const T = VO.map(v => q(v.t0)), ev = [];
  const W6 = span(6);
  const plans = [['Starter', 'R99', '7 days free', 2], ['Flow', 'R399', '30 days free', 3], ['Professional', 'R699', '30 days free', 3], ['Studio', 'R999', '30 days free', 3]];
  const pt = k => k === 0 ? T[2] : T[3] + (k - 1) * E8 * 1.5;
  const PAN = T[4];
  const learn = [['Which services book fastest', .25], ['Where your clients come from', .5], ['When you are busiest', .75]];
  const v5 = VO[4], lt = learn.map(([, f]) => q(v5.t0 + (v5.t1 - v5.t0) * f + .4));
  ev.push({ t: T[0], type: 'thunk' }, { t: T[1], type: 'stamp' }, ...plans.map((_, k) => ({ t: pt(k), type: 'snap' })), { t: PAN, type: 'wipe' },
    ...[...Array(30)].map((_, i) => ({ t: PAN + .3 + i * .07, type: i === 29 ? 'clack' : 'tick' })), ...lt.map(t => ({ t, type: 'snap' })), { t: T[5], type: 'knife' });

  function draw(g, t) {
    const pan = E(seg(t, PAN - E8, PAN + E8)) * -1500;
    g.save(); g.translate(0, pan);
    if (t < PAN + E8) {
      text(g, 'The deal.', M, 360, { t, tIn: T[0], size: 140, wt: 700 });
      // no payment to start: ink on the signal colour
      wipe(g, M, 430, W6, 120, C.sig, E(seg(t, T[1] - E8, T[1])), 'l');
      text(g, 'No payment to start', M + 32, 512, { t, tIn: T[1] + E16, size: 54, wt: 700 });
      plans.forEach(([n, p, d], k) => { const y = 700 + k * 150, t0 = pt(k);
        rule(g, M, y - 70, W6, seg(t, t0 - E8, t0), C.ink, k ? 1.5 : 2.5);
        text(g, n, M, y, { t, tIn: t0, size: 46, wt: 700 }); note(g, d, M, y + 46, t, t0 + E8, { col: k ? C.g3 : C.ink });
        text(g, p, M + W6, y + 30, { t, tIn: t0, size: k ? 96 : 120, wt: 700, align: 'right' }); });
    }
    g.restore();
    // thirty days, one cell each, filling linearly (the trial learning the business)
    if (t >= PAN) {
      g.save(); g.translate(0, 1500 + pan);
      note(g, 'Your 30-day trial', M, 260, t, PAN + .1, { col: C.ink });
      const cw = (W6 - 5 * 16) / 6, ch = 96;
      for (let i = 0; i < 30; i++) { const x = M + (i % 6) * (cw + 16), y = 300 + Math.floor(i / 6) * (ch + 16), t0 = PAN + .3 + i * .07;
        g.fillStyle = C.paper; g.fillRect(x, y, cw, ch);
        wipe(g, x, y, cw, ch, i === 29 ? C.sig : C.ink, seg(t, t0, t0 + .06), 'l');
        if (t >= t0 + .06) { g.font = '600 24px IN'; g.letterSpacing = '0px'; g.fillStyle = i === 29 ? C.ink : '#fff'; g.fillText(String(i + 1), x + 14, y + 36); } }
      learn.forEach(([s], i) => { const y = 980 + i * 84; rule(g, M, y - 50, W6, seg(t, lt[i] - E8, lt[i]), C.ink, 1.5); text(g, s, M, y, { t, tIn: lt[i], size: 42, wt: 700 }); });
      text(g, 'No contract. Cancel any time.', M, 1270, { t, tIn: T[5], size: 42, wt: 700, col: C.g3 });
      g.restore();
    }
  }
  const read = [['No payment to start', T[1], PAN, M, 450, M + 700, 530], ['Starter R99 7 days free', T[2], PAN, M, 640, M + W6, 760]];
  return { draw, ev, read };
}
