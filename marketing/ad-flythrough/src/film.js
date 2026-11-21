// NextSlot · "11 pm" — a Tabletop App Flythrough film, vertical 1080×1920, 30 s. One take over a dotted paper mat on an oak desk.
// At 11 pm a new client finds a studio's booking page, picks a service and a time (the slot is held), pays the deposit; the payment runs
// across the desk to the owner's phone, a bell delivers the "New Booking - Deposit received" email, and the client lands in Saturday's diary.
// The voice-over clock is in vo.js; every action below is cued to its words. Glow Studio and its client are fictional.
import * as THREE from 'three';
import { card, dotPatch, pill, rbox } from './world.js';
import { makeMonster } from './voxel.js';
import * as K from './cards.js';
import { clamp, seg, ss, eo, ei, eio, back, hash, V, arc, pop, beatBounce, squash, hops } from './anim.js';
import { VO, DUR as VDUR } from './vo.js';

export const DUR = VDUR;
export const END = { subEnd: VDUR };
export { VO };
export const HAZE = '#e9e3d8';
const C = K.COL, TOP = .005, PH = .009, YAX = V(0, 1, 0);
const ICON = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'nextslot-icon.png'; });

// ── timeline (film seconds; cued to the words of the voice-over, on the 120 BPM grid) ──
export const T = {
  land: .5, pop: 2.5, svcHop: [4.4, 4.75], svcLit: 4.75, toTimes: 5.5, timeHop: [5.75, 6.1], timeLit: 6.1, held: 6.5,
  toPay: 8.0, payHop: [8.5, 8.85], jump: [10.0, 10.5], paid: 10.75,
  run: [10.9, 12.4], bellPop: 12.4, bellFly: [12.6, 13.2], taps: [13.3, 13.55], banner: 13.7,
  diaryHops: [[16.75, 17.15], [17.25, 17.65]], flatten: [17.8, 18.15], booked: 18.15, paidStamp: 18.5,
  finale: 20.5, titleDrop: 22.75, titleLand: 23.0,
};

// ── the desk (world units; 1 unit = 1000 canvas px). Laid out in depth, so the vertical frame holds it ──
export const MAT = [1.8, 2.16];
export const CARDS = {
  phoneC: { c: V(-.27, 0, .42), w: .30, h: .56, yaw: .06 },    // the client's phone: the studio's booking page
  phoneO: { c: V(.17, 0, -.52), w: .30, h: .56, yaw: -.07 },   // the owner's phone
  diary: { c: V(.28, 0, .45), w: .36, h: .5, yaw: -.05 },        // the owner's Saturday
};
export const at = (n, u, v, y = TOP) => { const d = CARDS[n]; return V(u / 1000 - d.w / 2, y, v / 1000 - d.h / 2).applyAxisAngle(YAX, d.yaw).add(d.c); };

// ── pixel art: the client (10 × 14) and the bell ──
const CLIENT = [
  '..HHHHHH..', '.HHHHHHHH.', 'HHSSSSSSHH', 'HSSSSSSSSH', 'HSKSSSSKSH', 'HSKSSSSKSH', 'HSSSSSSSSH', 'HSSSMMSSSH', 'HHSSSSSSHH',
  '.H.SSSS.H.', '..RRRRRR..', '.RRRRRRRR.', '.RRRRRRRR.', '..LL..LL..'];
const CPAL = { H: '#3a2618', S: '#c98f68', K: '#0d0d0d', M: '#b5525e', R: '#e08f8a', L: '#2b2420' };
const BELL = ['....y....', '...YYY...', '..YYYYY..', '..YYYYY..', '.YYYYYYY.', '.YYYYYYY.', 'YYYYYYYYY', '....D....'];
const toArt = (rows, pal) => { const cells = []; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') cells.push([i, j, pal[ch]]); })); return { w: rows[0].length, h: rows.length, cells }; };
const pix = (c, rows, pal, x, y, s) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; c.fillStyle = pal[ch]; c.fillRect(x + i * s, y + j * s, s + .5, s + .5); }));

// ── the client's phone (300 × 560; the top of the screen points away from the camera) ──
const SVC = [['Lash Lift & Tint', '60 min · R450'], ['Brow Lamination', '45 min · R380'], ['Gel Overlay', '60 min · R320']];
const TIMES = ['09:00', '10:30', '12:00', '13:30'];
const ROW = k => 196 + k * 84;          // centre of list row k
function frame(c, dark) {
  const w = 300, h = 560;
  c.clearRect(0, 0, w, h);
  c.fillStyle = C.ink; K.rr(c, 0, 0, w, h, 36); c.fill();
  c.fillStyle = dark ? C.night : '#fbf8f3'; K.rr(c, 11, 11, w - 22, h - 22, 27); c.fill();
  c.fillStyle = dark ? '#000' : C.ink; K.rr(c, w / 2 - 36, 20, 72, 14, 7); c.fill();
  const col = dark ? C.nightInk : C.ink;
  K.txt(c, '23:04', 30, 30, { size: 16, wt: 700, col });
  for (let i = 0; i < 4; i++) { c.fillStyle = col; c.fillRect(214 + i * 7, 36 - (i + 1) * 4, 5, (i + 1) * 4); }
  c.strokeStyle = col; c.lineWidth = 2; K.rr(c, 246, 24, 26, 13, 3); c.stroke(); c.fillStyle = col; c.fillRect(249, 27, 15, 7);
}
function radio(c, x, y, on, dis) {
  c.lineWidth = 3; c.strokeStyle = dis ? '#d5cdbf' : on ? C.accent : '#b9ad9c'; c.beginPath(); c.arc(x, y, 13, 0, 7); c.stroke();
  if (on) { c.fillStyle = C.accent; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); }
}
function drawClient(c, st) {
  frame(c, false);
  const w = 300;
  // studio header: monogram + name
  c.fillStyle = C.ink; c.beginPath(); c.arc(46, 82, 20, 0, 7); c.fill();
  K.txt(c, 'G', 46, 83, { size: 22, wt: 800, font: K.SANS, col: '#fff', align: 'center' });
  K.txt(c, 'Glow Studio', 76, 74, { size: 22, wt: 800, font: K.SANS });
  K.txt(c, st.scr === 'page' ? 'Book online' : st.scr === 'times' ? 'Sat 28 Nov' : st.scr === 'pay' ? 'Checkout' : 'Booked', 77, 98, { size: 14, wt: 600, col: C.mute });
  c.fillStyle = C.line; c.fillRect(20, 124, w - 40, 2);
  if (st.scr === 'page') {
    K.txt(c, 'CHOOSE A SERVICE', 24, 148, { size: 12, wt: 700, col: C.mute, ls: 2 });
    SVC.forEach(([n, s], k) => {
      const y = ROW(k), on = k === 0 && st.svc;
      c.fillStyle = on ? '#f3e7d6' : '#fff'; K.rr(c, 18, y - 36, w - 36, 72, 14); c.fill();
      c.strokeStyle = on ? C.accent : C.line; c.lineWidth = on ? 3 : 2; K.rr(c, 18, y - 36, w - 36, 72, 14); c.stroke();
      radio(c, 46, y, on);
      K.txt(c, n, 76, y - 11, { size: 19, wt: 700, font: K.BODY });
      K.txt(c, s, 76, y + 15, { size: 15, wt: 600, font: K.BODY, col: on ? C.accentDk : C.mute });
    });
  } else if (st.scr === 'times') {
    K.txt(c, 'LASH LIFT & TINT', 24, 148, { size: 12, wt: 700, col: C.mute, ls: 2 });
    TIMES.forEach((tm, k) => {
      const y = ROW(k), on = k === 1 && st.time, dis = k === 0;
      c.fillStyle = on ? '#f3e7d6' : dis ? '#f4f0ea' : '#fff'; K.rr(c, 18, y - 36, w - 36, 72, 14); c.fill();
      c.strokeStyle = on ? C.accent : C.line; c.lineWidth = on ? 3 : 2; K.rr(c, 18, y - 36, w - 36, 72, 14); c.stroke();
      radio(c, 46, y, on, dis);
      K.txt(c, tm, 76, y + 1, { size: 26, wt: 800, font: K.SANS, col: dis ? '#c8bfb1' : C.ink });
      K.txt(c, dis ? 'Booked' : on ? 'Held for you' : 'Open', 268, y + 1, { size: 14, wt: 700, font: K.BODY, col: dis ? '#c8bfb1' : on ? C.accentDk : C.mute, align: 'right' });
      if (dis) { c.fillStyle = '#c8bfb1'; c.fillRect(74, y, 76, 2.5); }
    });
  } else {
    // checkout summary, then the pay button (or the confirmation)
    K.txt(c, 'Lash Lift & Tint', 24, 160, { size: 20, wt: 700, font: K.BODY });
    K.txt(c, 'Sat 28 Nov · 10:30', 24, 188, { size: 16, wt: 600, font: K.BODY, col: C.mute });
    c.fillStyle = C.line; c.fillRect(20, 214, w - 40, 2);
    const line = (a, b, y, col = C.ink, wt = 600) => { K.txt(c, a, 24, y, { size: 16, wt, font: K.BODY, col }); K.txt(c, b, 276, y, { size: 16, wt: 700, font: K.BODY, col, align: 'right' }); };
    line('Service', 'R450', 240, C.mute); line('Deposit now', 'R225', 272); line('Balance at visit', 'R225', 304, C.mute);
    if (st.scr === 'pay') {
      c.fillStyle = st.press ? C.accentDk : C.accent; K.rr(c, 18, 420, w - 36, 92, 20); c.fill();
      K.txt(c, 'Pay R225', 92, 452, { size: 24, wt: 800, font: K.SANS, col: '#fff' });
      K.txt(c, 'deposit', 92, 482, { size: 17, wt: 700, font: K.BODY, col: '#f6e9d8' });
    } else {
      c.fillStyle = C.green; c.beginPath(); c.arc(150, 400, 38, 0, 7); c.fill(); K.tick(c, 150, 402, 34, '#fff', 7);
      K.txt(c, 'Deposit paid', 150, 466, { size: 22, wt: 800, font: K.SANS, col: C.green, align: 'center' });
      K.txt(c, 'See you Saturday', 150, 494, { size: 15, wt: 600, font: K.BODY, col: C.mute, align: 'center' });
    }
  }
}

// ── the owner's phone: the lock screen at night, then the email banner ──
function drawOwner(c, st) {
  frame(c, true);
  const w = 300;
  K.txt(c, 'Wednesday 25 November', 150, 98, { size: 15, wt: 600, font: K.BODY, col: C.nightMute, align: 'center' });
  K.txt(c, '23:04', 150, 150, { size: 64, wt: 800, font: K.SANS, col: C.nightInk, align: 'center', ls: -1 });
  if (st.banner > 0) {
    const y = 140 + 96 * st.banner, a = st.banner;
    c.save(); c.globalAlpha = a;
    c.fillStyle = '#fbf8f3'; K.rr(c, 16, y, w - 32, 150, 20); c.fill();
    // mail glyph
    c.fillStyle = C.accent; K.rr(c, 30, y + 16, 34, 26, 6); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(33, y + 20); c.lineTo(47, y + 31); c.lineTo(61, y + 20); c.stroke();
    K.txt(c, 'EMAIL · NOW', 74, y + 30, { size: 12, wt: 700, col: C.mute, ls: 1.5 });
    K.txt(c, 'New Booking', 30, y + 70, { size: 25, wt: 800, font: K.SANS });
    K.txt(c, 'Deposit received', 30, y + 102, { size: 19, wt: 700, font: K.BODY, col: C.green });
    K.txt(c, 'Lash Lift & Tint · Sat 10:30', 30, y + 129, { size: 14, wt: 600, font: K.BODY, col: C.mute });
    c.restore();
  }
  // flashlight / camera buttons
  for (const x of [56, 244]) { c.fillStyle = '#2c2620'; c.beginPath(); c.arc(x, 500, 22, 0, 7); c.fill(); }
}

// ── the diary: Saturday, with the 10:30 gap ──
const DROWS = [['08:00', 'Brow Shape'], ['09:00', 'Gel Overlay'], ['10:30', null], ['12:00', 'Lash Fill'], ['13:30', 'Brow Tint'], ['15:00', 'Gel Overlay']];
const DROW = k => 128 + k * 60;           // top of diary row k
function drawDiary(c, st) {
  const w = 360, h = 500;
  K.cardBase(c, w, h, null, null);
  c.fillStyle = C.accent; c.fillRect(24, 26, 15, 15);
  K.txt(c, 'SATURDAY', 50, 34, { size: 17, wt: 800, col: C.ink, ls: 3 });
  K.txt(c, '28 Nov', 50, 66, { size: 26, wt: 800, font: K.SANS });
  K.txt(c, 'DIARY', 336, 34, { size: 13, wt: 700, col: C.mute, ls: 2, align: 'right' });
  c.fillStyle = C.line; c.fillRect(20, 100, w - 40, 2);
  DROWS.forEach(([tm, n], k) => {
    const y = DROW(k);
    K.txt(c, tm, 26, y + 25, { size: 16, wt: 700, font: K.BODY, col: C.mute });
    if (n) { c.fillStyle = '#efe8dc'; K.rr(c, 92, y + 4, 246, 44, 10); c.fill(); K.txt(c, n, 106, y + 26, { size: 16, wt: 700, font: K.BODY, col: '#6c6255' }); }
    else if (!st.booked) { c.save(); c.setLineDash([7, 6]); c.strokeStyle = '#c9bca8'; c.lineWidth = 2.5; K.rr(c, 93, y + 5, 244, 42, 10); c.stroke(); c.restore(); K.txt(c, 'open', 108, y + 26, { size: 15, wt: 600, font: K.BODY, col: '#b5a892' }); }
    else {
      c.fillStyle = C.accent; K.rr(c, 92, y + 2, 246, 48, 10); c.fill();
      K.txt(c, 'Lash Lift & Tint', 106, y + 26, { size: 17, wt: 800, font: K.BODY, col: '#fff' });
      if (st.paid) { c.fillStyle = C.green; K.rr(c, 268, y + 12, 60, 28, 14); c.fill(); K.txt(c, 'PAID', 298, y + 27, { size: 13, wt: 800, col: '#fff', align: 'center', ls: 1 }); }
    }
  });
}

export function build(ctx) {
  const { world, ev } = ctx, scene = world.scene;
  ctx.fx = { flash: 0 };
  const mat = (col, r = .5, extra = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: r, ...extra });

  // cards (canvases at 3.4× so screen text stays crisp in full-frame close-ups)
  const cv = {}, cd = {}, state = {};
  const mk = (n, draw, init, thick) => { const d = CARDS[n], [c, x] = K.canvas(d.w * 1000, d.h * 1000, 3.4); cv[n] = x; draw(x, init); state[n] = JSON.stringify(init); const g = card(world, c, d.w, d.h, thick); g.position.copy(d.c); g.rotation.y = d.yaw; scene.add(g); cd[n] = g; };
  const re = (n, draw, st) => { const k = JSON.stringify(st); if (k === state[n]) return; state[n] = k; draw(cv[n], st); cd[n].userData.redraw(); };
  mk('phoneC', drawClient, { scr: 'page' }, PH); mk('phoneO', drawOwner, {}, PH); mk('diary', drawDiary, {});

  // name plates on the paper (wide shots only)
  const plates = [];
  const plate = (s, p, yaw) => { const [c, x] = K.canvas(300, 50, 2); K.txt(x, s, 4, 26, { size: 20, wt: 800, col: C.mute, ls: 3 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.3, .05), new THREE.MeshStandardMaterial({ map: world.tex(c), transparent: true, roughness: .9 })); m.rotation.set(-Math.PI / 2, 0, yaw); m.position.copy(p); m.position.y = .0004; scene.add(m); plates.push(m); };
  plate('CLIENT', at('phoneC', 10, 610, 0), -CARDS.phoneC.yaw);
  plate('YOU', at('phoneO', 10, -60, 0), -CARDS.phoneO.yaw);
  plate('YOUR DIARY', at('diary', 10, 550, 0), -CARDS.diary.yaw);

  // the tent card behind the client's phone: the hour
  const tent = new THREE.Group(); scene.add(tent);
  const TENT = { w: .2, h: .075, lean: .2 };
  { const [c, x] = K.canvas(640, 240, 1); x.fillStyle = C.card; x.fillRect(0, 0, 640, 240); K.grain(x, 640, 240, 9, 3000); x.fillStyle = C.accent; x.fillRect(0, 0, 18, 240);
    K.txt(x, '11:04 PM', 60, 112, { size: 120, wt: 800, font: K.SANS, ls: 2 }); K.txt(x, 'WEDNESDAY', 64, 200, { size: 38, wt: 700, col: C.accent, ls: 9 });
    const face = new THREE.MeshStandardMaterial({ map: world.tex(c), roughness: .8 }), plain = new THREE.MeshStandardMaterial({ color: C.card, roughness: .85 });
    const f = new THREE.Mesh(new THREE.BoxGeometry(TENT.w, TENT.h, .0012), [plain, plain, plain, plain, face, plain]), b = new THREE.Mesh(new THREE.BoxGeometry(TENT.w, TENT.h, .0012), plain);
    const dz = Math.sin(TENT.lean) * TENT.h / 2, hy = Math.cos(TENT.lean) * TENT.h / 2;
    f.position.set(0, hy, dz); f.rotation.x = -TENT.lean; b.position.set(0, hy, -dz); b.rotation.x = TENT.lean; f.castShadow = b.castShadow = f.receiveShadow = true; tent.add(f, b);
    tent.position.set(-.33, 0, .04); tent.rotation.y = .1; }

  // desk props: a mug, a pen, a nail-polish bottle, a sticky-note pad, a ring light's worth of warmth (a lamp pool)
  {
    const mug = new THREE.Group(); const cup = new THREE.Mesh(new THREE.CylinderGeometry(.05, .046, .095, 40, 1, true), mat('#efe6da', .45, { side: THREE.DoubleSide })); cup.position.y = .0475; mug.add(cup);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(.046, 40), mat('#efe6da', .45)); bottom.rotation.x = -Math.PI / 2; bottom.position.y = .002; mug.add(bottom);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(.047, 40), mat('#9b6b3f', .25)); tea.rotation.x = -Math.PI / 2; tea.position.y = .08; mug.add(tea);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.025, .007, 12, 24, Math.PI), mat('#efe6da', .45)); handle.rotation.z = -Math.PI / 2; handle.position.set(.05, .048, 0); mug.add(handle);
    mug.position.set(-.36, 0, -.42); mug.rotation.y = 2.2; mug.traverse(o => o.castShadow = o.receiveShadow = true); scene.add(mug);
    const pen = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(.0062, .0062, .15, 20), mat('#2a241e', .35)); body.rotation.z = Math.PI / 2; pen.add(body);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.0062, .02, 20), mat('#d4b483', .3, { metalness: .6 })); tip.rotation.z = -Math.PI / 2; tip.position.x = .085; pen.add(tip);
    pen.position.set(.55, .0062, -.1); pen.rotation.y = 1.2; pen.traverse(o => o.castShadow = true); scene.add(pen);
    const pol = new THREE.Group(); const glass = new THREE.Mesh(rbox(.034, .036, .034, .008), mat('#c4626b', .2)); glass.position.y = .018; pol.add(glass);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .04, 20), mat('#1e1a16', .3)); cap.position.y = .056; pol.add(cap);
    pol.position.set(.56, 0, .2); pol.traverse(o => o.castShadow = o.receiveShadow = true); scene.add(pol);
    for (let i = 0; i < 4; i++) { const n = new THREE.Mesh(rbox(.1, .0016, .1, .002), mat(i === 3 ? '#f1dcae' : '#ead09a', .85)); n.position.set(-.6, .0008 + i * .0016, -.12); n.rotation.y = .3 + i * .03; n.castShadow = n.receiveShadow = true; scene.add(n); }
  }
  // warm lamp pools on the desk (additive, under the cards): it is late, the desk lamp is on
  { const [c, x] = K.canvas(512, 512, 1); const g = x.createRadialGradient(256, 256, 10, 256, 256, 250); g.addColorStop(0, 'rgba(255,214,160,1)'); g.addColorStop(1, 'rgba(255,214,160,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    const lm = new THREE.MeshBasicMaterial({ map: world.tex(c), transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (const [px, pz, s] of [[-.2, .3, 1.2], [.2, -.45, .9]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), lm); m.rotation.x = -Math.PI / 2; m.position.set(px, .0003, pz); m.renderOrder = 1; scene.add(m); } }

  // the route the payment takes: bronze dots from the client's phone to yours
  const ROUTE = [at('phoneC', 230, -30, 0), V(-.08, 0, .02), V(.08, 0, -.12), at('phoneO', 120, 590, 0)];
  const route = new THREE.CatmullRomCurve3(ROUTE.map(p => V(p.x, .0016, p.z)));
  const NR = 34, rp = [...Array(NR)].map((_, k) => route.getPointAt((k + .5) / NR));
  const dotGeo = new THREE.CylinderGeometry(.0068, .0068, .0026, 18);
  const routeMesh = new THREE.InstancedMesh(dotGeo, new THREE.MeshStandardMaterial({ color: C.accent, roughness: .45, emissive: C.accent, emissiveIntensity: 0 }), NR); routeMesh.castShadow = true; scene.add(routeMesh);
  // the payment: bronze coin cubes that hop along the route
  const NCUBE = 9, cubes = new THREE.InstancedMesh(rbox(.022, .022, .022, .005), new THREE.MeshStandardMaterial({ color: C.gold, roughness: .35, metalness: .25, emissive: C.accent, emissiveIntensity: .15 }), NCUBE); cubes.castShadow = true; scene.add(cubes);
  const cubeAt = (k, t) => { const t0 = T.run[0] + k * .1, u = seg(t, t0, t0 + 1.1); if (t < t0 || t > t0 + 1.25) return null; const p = route.getPointAt(Math.min(.999, eio(u))); p.y += .012 + .035 * Math.abs(Math.sin(u * Math.PI * 4)); return { p, s: Math.min(seg(t, t0, t0 + .08), 1 - seg(t, t0 + 1.1, t0 + 1.25)) }; };

  // impact rings and dot ripples
  const RIP = [{ t: T.pop, x: at('phoneC', 150, 470).x, z: at('phoneC', 150, 470).z, amp: .01, speed: .6 }, { t: T.jump[1], x: CARDS.phoneC.c.x, z: CARDS.phoneC.c.z, amp: .016, speed: .8 },
    { t: T.taps[0], x: CARDS.phoneO.c.x, z: CARDS.phoneO.c.z, amp: .014, speed: .8 }, { t: T.flatten[1], x: CARDS.diary.c.x, z: CARDS.diary.c.z, amp: .012, speed: .7 }];
  const rings = RIP.map(r => { const m = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 96), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, depthWrite: false, fog: false })); m.rotation.x = -Math.PI / 2; m.position.set(r.x, .0006, r.z); m.renderOrder = 2; scene.add(m); return { m, r }; });
  const skip = (x, z) => Object.values(CARDS).some(d => { const q = V(x - d.c.x, 0, z - d.c.z).applyAxisAngle(YAX, -d.yaw); return Math.abs(q.x) < d.w / 2 + .01 && Math.abs(q.z) < d.h / 2 + .01; });
  const dots = [dotPatch(world, CARDS.phoneC.c.x, CARDS.phoneC.c.z, .5, RIP.slice(0, 2), skip), dotPatch(world, CARDS.phoneO.c.x, CARDS.phoneO.c.z, .45, RIP.slice(2, 3), skip), dotPatch(world, CARDS.diary.c.x, CARDS.diary.c.z, .45, RIP.slice(3), skip)];

  // camera-facing pills
  const held = pill(world, 'SLOT HELD · 10 MIN', { h: .03, size: 40, font: K.SANS, wt: 800 });
  held.castShadow = false; held.renderOrder = 3;

  // cast
  const client = makeMonster(toArt(CLIENT, CPAL), .0058, 'client', .9), bell = makeMonster(toArt(BELL, { Y: C.gold, y: '#c4904f', D: C.accentDk }), .0068, 'bell');
  scene.add(client.root, bell.root);

  // places
  const PL = {
    popC: at('phoneC', 150, 470, PH), svc: at('phoneC', 46, ROW(0) + 8, PH), time: at('phoneC', 46, ROW(1) + 8, PH), payBtn: at('phoneC', 52, 474, PH),
    bellUp: at('phoneO', 150, 640, .12), bellO: at('phoneO', 150, 450, PH + .045),
    d1: V(.0, 0, .5), diaryRow: at('diary', 56, DROW(2) + 30, TOP),
  };
  const clientHops = [
    { t0: T.svcHop[0], t1: T.svcHop[1], from: PL.popC, to: PL.svc, h: .06 },
    { t0: T.timeHop[0], t1: T.timeHop[1], from: PL.svc, to: PL.time, h: .05 },
    { t0: T.payHop[0], t1: T.payHop[1], from: PL.time, to: PL.payBtn, h: .07 },
    { t0: T.jump[0], t1: T.jump[1], from: PL.payBtn, to: PL.payBtn, h: .11, ease: p => p },
    { t0: T.diaryHops[0][0], t1: T.diaryHops[0][1], from: PL.payBtn, to: PL.d1, h: .08 },
    { t0: T.diaryHops[1][0], t1: T.diaryHops[1][1], from: PL.d1, to: PL.diaryRow, h: .07 },
  ];

  // the closing title: a big paper card dropped into the open middle of the desk
  const BIG = { w: .62, h: .3, c: V(-.02, 0, -.06), yaw: .02 };
  const bigTitle = new THREE.Group(); scene.add(bigTitle);
  { const [c, x] = K.canvas(620, 300, 3.4); x.fillStyle = C.card; K.rr(x, 0, 0, 620, 300, 22); x.fill(); K.grain(x, 620, 300, 13, 5000);
    x.drawImage(ICON, 34, 40, 132, 132);
    x.font = `800 92px ${K.SANS}`; x.letterSpacing = '-3px'; x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillStyle = '#000'; x.fillText('Next', 182, 108); const nw = x.measureText('Next').width; x.fillStyle = '#b88b52'; x.fillText('Slot', 182 + nw - 2, 108); x.letterSpacing = '0px';
    x.fillStyle = C.line; x.fillRect(34, 200, 552, 3);
    K.txt(x, 'Start free at nextslot.co.za', 310, 248, { size: 34, wt: 800, font: K.SANS, col: C.accentDk, align: 'center' });
    const g = card(world, c, BIG.w, BIG.h, .007); bigTitle.add(g); bigTitle.position.copy(BIG.c); bigTitle.rotation.y = BIG.yaw; }
  const bigAt = (u, v, y = .0075) => V(u / 1000 - BIG.w / 2, y, v / 1000 - BIG.h / 2).applyAxisAngle(YAX, BIG.yaw).add(BIG.c);

  // ── text in the world meant to be read: [id, text, t0, t1, corners()] ──
  const uv = (n, u0, v0, u1, v1, y = PH) => () => [at(n, u0, v0, y), at(n, u1, v0, y), at(n, u0, v1, y), at(n, u1, v1, y)];
  const tentBox = (y0, y1) => () => { const f = tent.children[0]; f.updateMatrixWorld(); return [[-.45, y0], [.45, y0], [-.45, y1], [.45, y1]].map(([x, y]) => V(x * TENT.w, (.5 - y) * TENT.h, .0007).applyMatrix4(f.matrixWorld)); };
  const pillBox = m => () => { m.updateMatrixWorld(); const hw = m.w / 2, hh = m.geometry.parameters.height / 2; return [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]].map(([x, y]) => V(x, y, 0).applyMatrix4(m.matrixWorld)); };
  ctx.read = [
    ['hour', '11:04 PM', 0, 3.6, tentBox(.15, .62)],
    ['svc', 'Lash Lift & Tint 60 min · R450', 2.0, T.toTimes, uv('phoneC', 70, ROW(0) - 26, 250, ROW(0) + 26)],
    ['time', '10:30', T.toTimes + .1, T.toPay, uv('phoneC', 70, ROW(1) - 18, 160, ROW(1) + 18)],
    ['held', 'SLOT HELD · 10 MIN', T.held + .25, 9.3, pillBox(held)],
    ['pay', 'Pay R225 deposit', T.toPay + .05, T.jump[1], uv('phoneC', 88, 436, 230, 496)],
    ['nb', 'New Booking', T.banner + .3, 16.55, uv('phoneO', 28, 140 + 96 + 56, 210, 140 + 96 + 84)],
    ['dr', 'Deposit received', T.banner + .3, 16.55, uv('phoneO', 28, 140 + 96 + 90, 200, 140 + 96 + 114)],
    ['row', 'Lash Lift & Tint PAID', T.booked + .1, 21.4, uv('diary', 92, DROW(2), 338, DROW(2) + 50, TOP)],
    ['brand', 'NextSlot', T.titleLand + .1, DUR + 1, () => [bigAt(182, 60), bigAt(560, 60), bigAt(182, 156), bigAt(560, 156)]],
    ['cta', 'Start free at nextslot.co.za', T.titleLand + .1, DUR + 1, () => [bigAt(60, 228), bigAt(560, 228), bigAt(60, 270), bigAt(560, 270)]],
  ];

  // ── sound events ──
  ev.push({ t: T.land, type: 'land', v: .5 }, { t: T.pop, type: 'pop', k: 0, big: 1 },
    { t: T.svcHop[0], type: 'hop', k: 0 }, { t: T.svcHop[1], type: 'land', v: .35 }, { t: T.svcLit, type: 'select', k: 0 }, { t: T.toTimes, type: 'swipe' },
    { t: T.timeHop[0], type: 'hop', k: 1 }, { t: T.timeHop[1], type: 'land', v: .35 }, { t: T.timeLit, type: 'select', k: 1 }, { t: T.held, type: 'held' }, { t: T.toPay, type: 'swipe' },
    { t: T.payHop[0], type: 'hop', k: 2 }, { t: T.payHop[1], type: 'land', v: .4 }, { t: T.jump[0], type: 'jump' }, { t: T.jump[1], type: 'stamp' }, { t: T.paid, type: 'paid' },
    ...[...Array(NCUBE)].map((_, k) => ({ t: T.run[0] + k * .1 + .02, type: 'coin', k })), ...[...Array(8)].map((_, k) => ({ t: T.run[0] + .25 + k * .125, type: 'tick', k })),
    { t: T.bellPop, type: 'pop', k: 4 }, { t: T.bellFly[0], type: 'fly' }, ...T.taps.map(t => ({ t, type: 'tap' })), { t: T.banner, type: 'ring' },
    ...T.diaryHops.flatMap(([a, b], i) => [{ t: a, type: 'hop', k: 3 + i }, { t: b, type: 'land', v: .4 }]), { t: T.flatten[0], type: 'flatten' }, { t: T.booked, type: 'booked' }, { t: T.paidStamp, type: 'paidStamp' },
    ...[0, 1, 2].map(k => ({ t: T.finale + k * .25, type: 'land', v: .35 })), { t: T.titleDrop, type: 'drop' }, { t: T.titleLand, type: 'titleLand' });

  // subjects for the camera
  Object.assign(ctx.subj, {
    open: () => at('phoneC', 150, 330, .02).lerp(tent.position.clone().setY(.03), .3),
    cli: () => client.root.position.clone().add(V(0, .04, 0)),
    screenC: () => at('phoneC', 150, 300, .01), payBtn: () => at('phoneC', 112, 430, .02),
    cube: t => { const u = eio(seg(t, T.run[0] + .1, T.run[0] + .9 + 1.1)); const p = route.getPointAt(clamp(u, 0, .999)); return p.setY(.02); },
    run: () => V(-.04, 0, -.04), screenO: () => at('phoneO', 150, 290, .01), bell: () => bell.root.position.clone().add(V(0, .03, 0)),
    diary: () => at('diary', 168, 240, .01), hopD: () => V(.08, .03, .44), final: () => V(.0, 0, .0),
  });

  // ── per frame ──
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  return t => {
    // the client's phone: page → times → pay → paid
    const scr = t < T.toTimes ? 'page' : t < T.toPay ? 'times' : t < T.paid ? 'pay' : 'paid';
    re('phoneC', drawClient, { scr, svc: t >= T.svcLit ? 1 : 0, time: t >= T.timeLit ? 1 : 0, press: t >= T.jump[1] - .03 ? 1 : 0 });
    re('phoneO', drawOwner, { banner: t < T.banner ? 0 : Math.round(eo(seg(t, T.banner, T.banner + .3)) * 12) / 12 });
    re('diary', drawDiary, { booked: t >= T.booked ? 1 : 0, paid: t >= T.paidStamp ? 1 : 0 });

    // name plates in the wide shots only
    { const a = seg(t, T.finale - .6, T.finale); plates.forEach(m => { m.visible = a > .01; m.material.opacity = a; }); }
    // route dots: drawn as the payment leaves (10.75–11.1), lit while it runs, lit again at the curtain call
    for (let k = 0; k < NR; k++) { const s = back(seg(t, T.paid + k * .012, T.paid + k * .012 + .15), 2); m4.compose(rp[k], q.identity(), V(1, 1, 1).multiplyScalar(Math.max(1e-4, s))); routeMesh.setMatrixAt(k, m4); }
    routeMesh.instanceMatrix.needsUpdate = true;
    routeMesh.material.emissiveIntensity = .6 * Math.max(0, 1 - Math.abs(t - (T.run[0] + T.run[1]) / 2) / 1.0) + .35 * Math.max(0, 1 - Math.abs(t - T.finale - .4) / .8);
    // coin cubes
    for (let k = 0; k < NCUBE; k++) { const c = cubeAt(k, t); q.setFromAxisAngle(YAX, t * 3 + k); m4.compose(c ? c.p : V(0, -1, 0), q, V(1, 1, 1).multiplyScalar(Math.max(1e-4, c ? c.s : 0))); cubes.setMatrixAt(k, m4); }
    cubes.instanceMatrix.needsUpdate = true;
    // the held pill rises over the phone when the time is taken; leaves before the push-in
    { const p = back(seg(t, T.held, T.held + .25), 2.2), out = ss(seg(t, 9.15, 9.4)); held.visible = t >= T.held && out < 1; held.scale.setScalar(Math.max(.001, p * (1 - out))); held.position.copy(at('phoneC', 150, 150, .05)); held.face(ctx.camera); }

    // the client: a sticker on the page → pops up → hops service, time, pay → stamps → hops across to the diary → lies down into Saturday 10:30
    {
      const P0 = pop(t, T.pop, .45, .05), h = hops(t, clientHops, PL.popC);
      const pos = h.pos.clone(); pos.y += P0.y;
      const idle = t > T.pop + .5 && t < T.svcHop[0] ? beatBounce(t, T.pop + .5, T.svcHop[0] - .05, .01)
        : t > T.paid && t < T.diaryHops[0][0] ? beatBounce(t, T.paid + .2, T.diaryHops[0][0] - .05, .012) : { y: 0, sq: 1 };
      pos.y += idle.y;
      // anticipation before the stamp: crouch on the button 9.75–10.0
      const crouch = t > 9.7 && t < T.jump[0] ? 1 - .25 * Math.sin(Math.PI * seg(t, 9.7, T.jump[0])) : 1;
      const stampSq = t > T.jump[1] && t < T.jump[1] + .25 ? 1 - .35 * Math.sin(Math.PI * seg(t, T.jump[1], T.jump[1] + .25)) : 1;
      const flat = ss(seg(t, ...T.flatten));
      const dir = h.dir && h.air !== null ? clamp(Math.atan2(h.dir.x, h.dir.z) * .3, -.6, .6) : 0;
      client.set({ pos, vis: t >= T.pop - .02 && flat < .98, e: Math.min(P0.e, 1 - flat), hinge: Math.min(P0.hinge, 1 - flat), sq: squash(t, h.lands, h.takeoffs, h.air) * P0.sq * idle.sq * crouch * stampSq, yaw: dir, scale: 1 - .4 * flat });
      client.blink((t % 2.4) < .12 || (t > T.jump[1] - .05 && t < T.jump[1] + .15));
    }
    // the bell: pops out where the payment arrives, flies onto your phone, taps twice, swings with the banner, leaves
    {
      const P0 = pop(t, T.bellPop, .35, .04);
      let pos = ROUTE[3].clone().setY(PH).lerp(PL.bellUp, eo(seg(t, T.bellPop, T.bellPop + .2)));
      const f = seg(t, ...T.bellFly);
      if (t >= T.bellFly[0]) { pos = PL.bellUp.clone().lerp(PL.bellO, eio(f)); pos.y += .1 * arc(f); }
      for (const tp of T.taps) { const d = t - tp; if (d > 0 && d < .2) pos.y -= .03 * Math.sin(Math.PI * d / .2); }
      if (t > T.bellFly[1]) pos.y += .005 * Math.sin(t * 5);
      const swing = t > T.banner && t < T.banner + 1.2 ? .5 * Math.sin((t - T.banner) * 22) * Math.exp(-(t - T.banner) * 2.5) : 0;
      const gone = ss(seg(t, 15.4, 15.7));
      bell.set({ pos, vis: t >= T.bellPop && gone < 1, e: P0.e, hinge: P0.hinge, sq: P0.sq, tiltZ: swing, scale: 1 - gone });
    }
    // card jolts: the client's phone on the stamp, yours on the taps and the ring
    { let j = 0; const d = t - T.jump[1]; if (d > 0 && d < .3) j = .004 * Math.sin(d * 60) * (1 - d / .3); cd.phoneC.position.x = CARDS.phoneC.c.x + j;
      let k = 0; for (const tr of [...T.taps, T.banner]) { const e = t - tr; if (e > 0 && e < .3) k += .003 * Math.sin(e * 60) * (1 - e / .3); } cd.phoneO.position.x = CARDS.phoneO.c.x + k; }
    for (const d of dots) d.update(t);
    rings.forEach(({ m, r }) => { const d = t - r.t, on = d > 0 && d < 1.1; m.visible = on; if (on) { m.scale.setScalar(.15 + d * .45); m.material.opacity = .55 * (1 - d / 1.1); } });

    // the curtain call: every card hops once, then the title card drops into the open middle; the hour tent folds away as it lands
    { const stations = [cd.phoneC, cd.diary, cd.phoneO];
      stations.forEach((g, k) => { const d = t - (T.finale + k * .25); g.position.y = d > 0 && d < .45 ? .03 * arc(d / .45) : 0; });
      const p = seg(t, T.titleDrop, T.titleLand), d = t - T.titleLand;
      bigTitle.visible = t >= T.titleDrop; bigTitle.position.y = (1 - ei(p)) * .7 + (d > 0 && d < .35 ? .012 * Math.sin(Math.PI * d / .35) * (1 - d / .35) : 0);
      const sq = d > 0 && d < .2 ? 1 - .25 * Math.sin(Math.PI * d / .2) : 1; bigTitle.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      tent.scale.setScalar(Math.max(.001, 1 - ss(seg(t, T.titleLand - .1, T.titleLand + .2)))); tent.visible = tent.scale.x > .002; }
  };
}
