// Shared timeline helpers and reusable scenes for every NextSlot ad variant.
//
// Every variant is authored on a 20-second timeline (BASE). The page length is
// set with ?d=<seconds>; longer cuts play the same choreography proportionally
// slower. Each reusable scene has a markup builder (C.*) and a renderer (R.*)
// that takes the scene's start time t0, so variants can place them anywhere.

const BASE = 20;

// ── timing helpers ────────────────────────────────────────────────────────────
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => cl((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 3);                       // ease-out cubic
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const lerp = (a, b, x) => a + (b - a) * x;

function sceneOpacity(t, [a, b], fade = .3) {
  if (t < a || t > b) return 0;
  return Math.min(a === 0 ? 1 : prog(t, a, a + fade), b >= BASE ? 1 : 1 - prog(t, b - fade, b));
}
function rise(el, t, a, dur = .5, dist = 60) {
  const p = eo(prog(t, a, a + dur));
  el.style.opacity = p; el.style.transform = `translateY(${(1 - p) * dist}px)`;
}
function mount(sel, html) { $(sel).innerHTML = html; }

const brandMark = () =>
  `<img src="assets/nextslot-icon.png" alt=""><div class="wm"><span class="n">Next</span><span class="s">Slot</span></div>`;
const tick = (size = 56) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ── markup builders ───────────────────────────────────────────────────────────
const C = {
  reveal: ({ tag, offer = "" }) => `
    <div class="brand" id="rv-brand">${brandMark()}</div>
    <div class="center h tag" id="rv-tag">${tag.split(" ").map(w => `<span class="w">${w}</span>`).join(" ")}</div>
    ${offer ? `<div class="offer" id="rv-offer">${offer}</div>` : ""}`,

  phone: ({ title, sub }) => `
    <div class="center caption" id="ph-cap"><div class="h">${title}</div><p>${sub}</p></div>
    <div class="phone" id="phone">
      <div class="screen">
        <div class="notch"></div>
        <div class="biz">
          <div class="avatar">G</div>
          <div class="name">Glow Studio</div>
          <div class="url">glowstudio.nextslot.co.za</div>
        </div>
        <div id="p1">
          <div class="step-label">Choose a service</div>
          <div class="svc" id="svc1"><div><b>Lash Lift &amp; Tint</b><span>60 min</span></div><div class="pr">R450</div></div>
          <div class="svc"><div><b>Brow Shape</b><span>30 min</span></div><div class="pr">R180</div></div>
          <div class="svc"><div><b>Gel Manicure</b><span>45 min</span></div><div class="pr">R320</div></div>
        </div>
        <div id="p2" style="position:absolute;left:0;right:0;top:330px;">
          <div class="step-label">Pick a time</div>
          <div class="days">
            <div class="day"><i>Thu</i><b>13</b></div>
            <div class="day"><i>Fri</i><b>14</b></div>
            <div class="day" id="day3"><i>Sat</i><b>15</b></div>
            <div class="day"><i>Sun</i><b>16</b></div>
          </div>
          <div class="step-label" style="margin-top:30px">Saturday</div>
          <div class="times">
            <div class="time gone">09:00</div>
            <div class="time" id="t1030">10:30</div>
            <div class="time">12:00</div>
            <div class="time gone">13:30</div>
            <div class="time">15:00</div>
            <div class="time">16:30</div>
          </div>
          <div class="hold" id="hold"><span>⏱ Slot held for you</span><span id="holdclock">10:00</span></div>
        </div>
        <div class="paybtn" id="paybtn">Pay R225 deposit</div>
        <div class="done" id="done">
          <div class="check"><svg width="110" height="110" viewBox="0 0 24 24"><path id="tick" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="24" stroke-dashoffset="24"/></svg></div>
          <h3>You're booked!</h3>
          <p>Lash Lift &amp; Tint<br>Sat 15 · 10:30</p>
        </div>
        <div class="tap" id="tap"></div>
      </div>
    </div>`,

  pay: ({ line1, line2 }) => `
    <div class="center" style="top:250px">
      <div class="h big" id="pay-a">${line1}</div>
      <div class="h big bronze" id="pay-b" style="margin-top:14px">${line2}</div>
    </div>
    <div class="pay-grid">
      <div class="pay ps"><img src="assets/payshap.png">PayShap</div>
      <div class="pay"><img src="assets/Yoco.svg"></div>
      <div class="pay"><img src="assets/ikhokha.svg"></div>
      <div class="pay"><img src="assets/payfast-trim.png"></div>
    </div>
    <div class="toast" id="toast">
      <div class="ic">${tick()}</div>
      <div><b>Deposit received · R225</b><span>Lash Lift &amp; Tint · Sat 10:30</span></div>
    </div>`,

  insights: () => `
    <div class="center caption" style="top:190px" id="ins-cap">
      <div class="h">See where your<br>business <span class="bronze">can grow.</span></div>
    </div>
    <div class="dash" id="dash">
      <div class="lbl">Revenue this month</div>
      <div class="num" id="rev">R0</div>
      <div class="delta" id="delta">▲ 18% vs last month</div>
      <div class="bars" id="bars">
        <div class="bar" data-h="62"><i>Mon</i></div>
        <div class="bar lo" data-h="24"><i>Tue</i></div>
        <div class="bar" data-h="55"><i>Wed</i></div>
        <div class="bar" data-h="70"><i>Thu</i></div>
        <div class="bar hi" data-h="96"><i>Fri</i></div>
        <div class="bar hi" data-h="100"><i>Sat</i></div>
      </div>
    </div>
    <div class="illus" id="illus">Illustrative</div>
    <div class="nexty" id="nexty">
      <div class="tagl">✦ Nexty insight</div>
      <h4>Fill your quietest day</h4>
      <p>Tuesday is your slowest day. A targeted offer to your clients could fill those gaps.</p>
    </div>`,

  who: ({ headline }) => `
    <div class="photo" style="background-image:url(assets/beautician.jpg)"></div>
    <div class="photo" style="background-image:url(assets/barber.jpg)"></div>
    <div class="photo" style="background-image:url(assets/tools-tattoo-artist-at-work.webp)"></div>
    <div class="photo" style="background-image:url(assets/professional-photographer-at-work.webp)"></div>
    <div class="shade"></div>
    <div class="center h" id="who-h">${headline}</div>
    <div class="chip">Beauty &amp; Wellness</div>
    <div class="chip">Barbers</div>
    <div class="chip">Tattoo Artists</div>
    <div class="chip">Photographers</div>`,

  cta: () => `
    <div class="brand" id="cta-brand">${brandMark()}</div>
    <div class="center h cta" id="cta-h">Start <span class="bronze">free</span> today.</div>
    <div class="center sub" id="cta-sub"><b>Free trial · No payment required</b><br>Plans from R99/month</div>
    <div class="btn" id="btn">nextslot<span>.co.za</span></div>
    <div class="center foot" id="cta-foot">Proudly made in Cape Town 🇿🇦</div>`,
};

// ── renderers (t = timeline time, t0 = scene start) ──────────────────────────
const R = {
  // Dark → cream circular wipe starting at `at`.
  wipe(t, at) {
    const wp = eio(prog(t, at, at + .5));
    $("#wipe").style.clipPath = `circle(${wp * 1300}px at 50% 55%)`;
    $("#wipe").style.opacity = t > at - .05 && t < at + .65 ? 1 : 0;
  },

  reveal(t, t0, scene) {
    const u = t - t0;
    if (u < -.25 || u > 2.95) return;
    const lp = back(prog(u, .1, .7));
    const lg = $("#rv-brand");
    lg.style.opacity = cl(prog(u, .1, .35));
    lg.style.transform = `scale(${lerp(.55, 1, lp)})`;
    $$("#rv-tag .w").forEach((w, i) => rise(w, u, .8 + i * .09, .4, 36));
    const of = $("#rv-offer");
    if (of) {
      const p = back(prog(u, 1.75, 2.1));
      of.style.opacity = cl(prog(u, 1.75, 1.9));
      of.style.transform = `translateX(-50%) scale(${lerp(.7, 1, p)})`;
    }
    $(scene).style.transform = `scale(${1 + prog(u, .15, 2.75) * .04})`;
  },

  phone(t, t0) {
    const u = t - t0;
    if (u < -.1 || u > 4.3) return;
    rise($("#ph-cap"), u, .1, .5, 50);
    const ph = eo(prog(u, .05, .65));
    $("#phone").style.transform = `translateY(${(1 - ph) * 500}px)`;
    const tap = $("#tap");
    const tapAt = (tt, x, y) => { const p = prog(u, tt, tt + .35); return p > 0 && p < 1 ? { x, y, p } : null; };
    const tp = [tapAt(.85, 300, 420), tapAt(1.85, 420, 470), tapAt(2.3, 450, 742), tapAt(3.1, 300, 1185)].find(Boolean);
    if (tp) { tap.style.left = tp.x + "px"; tap.style.top = tp.y + "px"; tap.style.opacity = 1 - tp.p; tap.style.transform = `scale(${lerp(.5, 1.6, tp.p)})`; }
    else tap.style.opacity = 0;
    $("#svc1").classList.toggle("sel", u > .95);
    const sl = eio(prog(u, 1.25, 1.65));
    $("#p1").style.transform = `translateX(${-sl * 640}px)`; $("#p1").style.opacity = 1 - sl;
    $("#p2").style.transform = `translateX(${(1 - sl) * 640}px)`; $("#p2").style.opacity = sl;
    $("#day3").classList.toggle("sel", u > 1.95);
    $("#t1030").classList.toggle("sel", u > 2.4);
    const hp = back(prog(u, 2.45, 2.8));
    $("#hold").style.opacity = cl(prog(u, 2.45, 2.6)); $("#hold").style.transform = `scale(${lerp(.8, 1, hp)})`;
    const secs = Math.max(0, 600 - Math.floor(Math.max(0, u - 2.5) * 2.2));
    $("#holdclock").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    const bp = prog(u, 3.1, 3.28);
    $("#paybtn").style.opacity = cl(prog(u, 2.6, 2.9));
    $("#paybtn").style.transform = `scale(${1 - Math.sin(bp * Math.PI) * .05})`;
    $("#paybtn").style.background = u > 3.15 ? "#94672F" : "";
    const dn = eo(prog(u, 3.3, 3.6));
    $("#done").style.opacity = dn;
    $("#done").style.transform = `scale(${lerp(1.05, 1, dn)})`;
    $("#tick").style.strokeDashoffset = 24 * (1 - eo(prog(u, 3.45, 3.8)));
  },

  pay(t, t0) {
    const u = t - t0;
    if (u < -.15 || u > 3.05) return;
    rise($("#pay-a"), u, .1, .45, 50);
    rise($("#pay-b"), u, .35, .45, 50);
    $$(".pay").forEach((p, i) => {
      const a = .6 + i * .12, x = back(prog(u, a, a + .4));
      p.style.opacity = cl(prog(u, a, a + .15)); p.style.transform = `scale(${lerp(.6, 1, x)})`;
    });
    const tp = back(prog(u, 1.45, 1.9));
    $("#toast").style.opacity = cl(prog(u, 1.45, 1.65));
    $("#toast").style.transform = `translateY(${(1 - tp) * 160}px)`;
  },

  insights(t, t0) {
    const u = t - t0;
    if (u < -.15 || u > 3.45) return;
    rise($("#ins-cap"), u, .1, .5, 50);
    const dp = eo(prog(u, .25, .75));
    $("#dash").style.opacity = dp; $("#dash").style.transform = `translateY(${(1 - dp) * 120}px)`;
    $("#illus").style.opacity = dp;
    const rv = Math.round(18450 * eo(prog(u, .45, 1.65)) / 10) * 10;
    $("#rev").textContent = "R" + rv.toLocaleString("en-ZA").replace(/ /g, " ");
    $("#delta").style.opacity = cl(prog(u, 1.45, 1.7));
    $$("#bars .bar").forEach((b, i) => {
      const p = eo(prog(u, .6 + i * .08, 1.2 + i * .08));
      b.style.height = (+b.dataset.h * p * 3) + "px";
    });
    // highlight the slow day when Nexty speaks
    const lo = $(".bar.lo"); lo.style.boxShadow = u > 1.95 ? `0 0 0 ${6 + Math.sin(t * 10) * 3}px rgba(224,83,63,.35)` : "none";
    const np = back(prog(u, 1.8, 2.3));
    $("#nexty").style.opacity = cl(prog(u, 1.8, 2.0));
    $("#nexty").style.transform = `translateY(${(1 - np) * 180}px)`;
  },

  who(t, t0, scene) {
    const u = t - t0;
    if (u < -.1 || u > 2.3) return;
    rise($("#who-h"), u, .1, .45, 50);
    const photos = $$(scene + " .photo"), chips = $$(scene + " .chip");
    const seg = 0.5, start = .1;
    photos.forEach((p, i) => {
      const a = start + i * seg;
      const vis = i === photos.length - 1 ? prog(u, a, a + .15) : Math.min(prog(u, a, a + .15), 1 - prog(u, a + seg, a + seg + .15));
      p.style.opacity = vis;
      p.style.transform = `scale(${1.12 - prog(u, a, a + seg + .3) * .1})`;
      const c = chips[i], cp = back(prog(u, a + .05, a + .35));
      c.style.opacity = i === chips.length - 1 ? cl(prog(u, a + .05, a + .2)) : Math.min(cl(prog(u, a + .05, a + .2)), 1 - prog(u, a + seg - .05, a + seg + .05));
      c.style.transform = `translateX(-50%) scale(${lerp(.7, 1, cp)})`;
    });
  },

  cta(t, t0) {
    const u = t - t0;
    if (u < -.05) return;
    const lp = back(prog(u, .1, .6));
    $("#cta-brand").style.opacity = cl(prog(u, .1, .3));
    $("#cta-brand").style.transform = `scale(${lerp(.6, 1, lp)})`;
    rise($("#cta-h"), u, .35, .45, 50);
    rise($("#cta-sub"), u, .6, .45, 40);
    const bp = back(prog(u, .85, 1.25)), pulse = u > 1.35 ? Math.sin((u - 1.35) * 7) * .025 : 0;
    $("#btn").style.opacity = cl(prog(u, .85, 1.0));
    $("#btn").style.transform = `translateX(-50%) scale(${lerp(.6, 1, bp) + pulse})`;
    rise($("#cta-foot"), u, 1.15, .4, 20);
  },
};

// ── page wiring ───────────────────────────────────────────────────────────────
// windows: { sceneId: [in, out] } on the 20-second timeline; render(t) draws
// everything else. Exposes window.render(seconds) and window.ready.
function defineAd({ windows, render }) {
  const DURATION = +(new URLSearchParams(location.search).get("d") || BASE);
  const STRETCH = DURATION / BASE;
  const draw = t => {
    for (const id in windows) $("#" + id).style.opacity = sceneOpacity(t, windows[id]);
    render(t);
  };
  window.DURATION = DURATION;
  window.render = t => draw(t / STRETCH);
  window.ready = document.fonts.ready.then(() => Promise.all(
    Array.from(document.images).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))));
  draw(0);
}
