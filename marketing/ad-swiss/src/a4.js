// A4 · PRODUCT AWARE — "Is it for you?". The viewer knows NextSlot and is weighing whether it fits them.
// System: three rows, one objection each. The objection arrives in grey quotes, is knife-cut, and the answer snaps in under it in ink.
// The signal colour: the tick that closes each row, and the final "Yes."
import { C, M, col, span, E, seg, E8, E16, text, numeral, knife, note, rule, wipe } from './swiss.js';
export const RIGHT = 'Three objections';
export const LINE = 'Built for the way you already work.';
export const HL = /^you\.?$/i;
const q = t => Math.round(t / E16) * E16;

export function build(VO) {
  const T = VO.map(v => q(v.t0)), ev = [];
  const W6 = span(6), ROW = { y: 560, h: 250 };
  const rows = [
    { obj: '“I work alone.”', ans: 'Solo pros and small teams.', sub: 'One login, your own calendar', o: 1, a: 2 },
    { obj: '“My clients live on WhatsApp.”', ans: 'One link. No app, no account.', sub: 'Share it in your WhatsApp chats', o: 3, a: 4 },
    { obj: '“My numbers are too small.”', ans: 'Small numbers are still yours.', sub: 'Rebooking rate and average booking value, on every plan', o: 5, a: 6 },
  ];
  const YES = T[7];
  rows.forEach(r => ev.push({ t: T[r.o], type: 'snap' }, { t: T[r.a] - E8 * 2, type: 'knife' }, { t: T[r.a], type: 'clack' }, { t: T[r.a] + .6, type: 'tick' }));
  ev.push({ t: T[0], type: 'thunk' }, { t: YES - E8, type: 'knife' }, { t: YES, type: 'stamp' });

  function draw(g, t) {
    // the question, cut and answered at the end
    if (t >= T[0] - E8) knife(g, { x: M, y: 300, w: W6, h: 160 }, t, YES - E8, g2 => text(g2, 'Is it for you?', M, 430, { t, tIn: T[0], size: 120, wt: 700, maxW: W6 }));
    if (t >= YES) numeral(g, 'Yes.', M, 450, 220, t, YES, C.sig);
    rows.forEach((r, i) => {
      const y = ROW.y + i * ROW.h, to = T[r.o], ta = T[r.a];
      rule(g, M, y, W6, seg(t, to - E8, to), C.ink, 2);
      note(g, String(i + 1).padStart(2, '0'), M, y + 48, t, to);
      if (t >= to && t < ta - E8 * 2 + 2 * E8) knife(g, { x: M, y: y + 66, w: W6, h: 70 }, t, ta - E8 * 2, g2 => text(g2, r.obj, M, y + 120, { t, tIn: to, size: 50, wt: 600, col: C.g3, maxW: W6 }));
      text(g, r.ans, M, y + 120, { t, tIn: ta, size: 50, wt: 700, maxW: W6 - 90 });
      note(g, r.sub, M, y + 180, t, ta + .3, { col: C.g3, size: 24 });
      // the tick: a signal square that wipes in at the row's right edge
      const tp = E(seg(t, ta + .6 - E8, ta + .6)); wipe(g, M + W6 - 56, y + 76, 56, 56, C.sig, tp, 'u');
      if (tp >= 1) { g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'square'; g.beginPath(); g.moveTo(M + W6 - 44, y + 106); g.lineTo(M + W6 - 32, y + 118); g.lineTo(M + W6 - 12, y + 92); g.stroke(); }
    });
  }
  const read = rows.map((r, i) => [r.ans, T[r.a], 25.6, M, ROW.y + i * ROW.h + 70, M + 900, ROW.y + i * ROW.h + 130]);
  return { draw, ev, read };
}
