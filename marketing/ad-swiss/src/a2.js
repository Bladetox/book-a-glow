// A2 · PROBLEM AWARE — "Answer this". The viewer knows their numbers are a mess but not that a system fixes it.
// System: a question with an empty answer slot. Split frame: three equal cells (chats, diary, banking app) hold the answer in pieces.
// Knife cuts remove the three sources; one booking record wipes in and its fields snap in on the words; the slot fills in the signal colour.
import { C, M, col, span, E, seg, E8, E16, text, numeral, knife, note, rule, wipe, font } from './swiss.js';
export const RIGHT = 'Illustrative';
export const LINE = 'Know your numbers without counting them.';
export const HL = /^guess\.?$/i;
const q = t => Math.round(t / E16) * E16;

export function build(VO) {
  const T = VO.map(v => q(v.t0)), ev = [];
  const W6 = span(6);
  const CELL = { y: 560, h: 236, gap: 24 };
  const cells = [['Chats', '412', 'messages'], ['Diary', '186', 'entries'], ['Banking app', '94', 'payments']];
  const cutAt = k => T[5] + k * E8;           // the three sources are cut one after another
  const REC = { y: 560, h: 420 };
  // v7 phrase times (by letters): "The service. | The price. | The day. | Where the client found you."
  const v7 = VO[6], frac = [0, .2, .37, .52], ft = frac.map(f => q(v7.t0 + (v7.t1 - v7.t0) * f));
  const fields = [['Service', 'Lash Lift & Tint'], ['Price', 'R450'], ['Day', 'Saturday, 10:30'], ['Source', 'Instagram']];
  const TABLE = [['Lash Lift & Tint', 'R6 300'], ['Gel Overlay', 'R5 120'], ['Brow Lamination', 'R2 660']];
  ev.push({ t: T[0], type: 'thunk' }, { t: T[1], type: 'snap' }, { t: T[3], type: 'wipe' }, ...[0, 1, 2].map(k => ({ t: T[3] + .3 + k * .25, type: 'snap' })),
    { t: T[4], type: 'clack' }, { t: VO[4].t1 + .2, type: 'knife' }, ...[0, 1, 2].map(k => ({ t: cutAt(k), type: 'knife' })), { t: T[5] + 4 * E8, type: 'wipe' },
    ...ft.map(t => ({ t, type: 'snap' })), ...[0, 1, 2].map(k => ({ t: T[7] + .3 + k * E8, type: 'tick' })), { t: T[7] + .5, type: 'stamp' });

  function draw(g, t) {
    // the question and its empty slot
    numeral(g, '?', M, 470, 300, t, T[0], C.ink, T[1] - E8);
    text(g, 'Your top-earning service last month:', M, 260, { t, tIn: T[1], size: 54, wt: 700, maxW: W6, lh: 62 });
    rule(g, M, 470, W6, seg(t, T[1] + .4, T[1] + .9), C.ink, 3);
    // the cursor blinks in eighths until the answer arrives
    const filled = t >= T[7] + .5;
    if (t > T[1] + .9 && !filled && t < T[4]) { if (Math.floor(t / .25) % 2 === 0) { g.fillStyle = C.ink; g.fillRect(M, 400, 6, 62); } }
    // the guess, cut
    if (t >= T[4]) knife(g, { x: M, y: 395, w: 420, h: 72 }, t, VO[4].t1 + .2, g2 => text(g2, 'R ? ? ?', M, 458, { t, tIn: T[4], size: 72, wt: 700, col: C.g2 }));
    if (filled) text(g, 'Lash Lift & Tint', M, 458, { t, tIn: T[7] + .5, size: 72, wt: 700, col: C.sig });
    // three sources in three equal cells
    if (t >= T[3] - E8 && t < T[5] + 4 * E8) cells.forEach(([name, n, unit], k) => {
      const y = CELL.y + k * (CELL.h + CELL.gap), t0 = T[3] + .3 + k * .25;
      knife(g, { x: M, y, w: W6, h: CELL.h }, t, cutAt(k), g2 => {
        wipe(g2, M, y, W6, CELL.h, C.paper, E(seg(t, t0 - E8, t0)), 'l');
        if (t < t0) return;
        note(g2, name, M + 28, y + 52, t, t0 + E16, { col: C.ink });
        numeral(g2, n, M + 28, y + 196, 120, t, t0 + E8);
        text(g2, unit, M + 300, y + 196, { t, tIn: t0 + 3 * E8, size: 34, wt: 600, col: C.g3 });
        // the fragments: grey bars of uneven length, each one a piece of the answer
        for (let i = 0; i < 6; i++) { const w = 120 + ((i * 53 + k * 31) % 150), x = M + W6 - 28 - w, yy = y + 34 + i * 30; wipe(g2, x, yy, w, 16, k === 0 && i % 2 ? C.g1 : C.g2, E(seg(t, t0 + i * E16, t0 + i * E16 + E8)), 'r'); }
      });
    });
    // one booking record: every field kept
    if (t >= T[5] + 3 * E8) {
      const p = E(seg(t, T[5] + 3 * E8, T[5] + 4 * E8)); wipe(g, M, REC.y, W6, REC.h, C.paper, p, 'u');
      if (p >= 1) {
        note(g, 'One booking, kept whole', M + 32, REC.y + 56, t, T[5] + 4 * E8, { col: C.ink });
        fields.forEach(([k, v], i) => { const y = REC.y + 130 + i * 76; rule(g, M + 32, y - 44, W6 - 64, seg(t, ft[i] - E8, ft[i]), C.g1, 1.5);
          note(g, k, M + 32, y, t, ft[i]); text(g, v, M + 300, y + 4, { t, tIn: ft[i], size: 40, wt: 700 }); });
      }
    }
    // the record adds up: a ranked table, top row in the signal colour
    if (t >= T[7] + .2) TABLE.forEach(([s, r], i) => { const y = 1080 + i * 72, t0 = T[7] + .3 + i * E8;
      rule(g, M, y - 48, W6, seg(t, t0 - E8, t0), C.ink, 1.5);
      text(g, s, M, y, { t, tIn: t0, size: 40, wt: i ? 600 : 700, col: i ? C.ink : C.sig }); text(g, r, M + W6, y, { t, tIn: t0, size: 40, wt: 700, align: 'right', col: i ? C.ink : C.sig }); });
    note(g, 'Last month, by revenue', M, 1300, t, T[7] + .5);
  }
  const read = [['Your top-earning service last month:', T[1], T[4], M, 210, M + 900, 330], ['Lash Lift & Tint', T[7] + .5, 25.6, M, 400, M + 560, 470]];
  return { draw, ev, read };
}
