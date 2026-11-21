"""Foley for NextSlot · "11 pm" (Tabletop App Flythrough): every on-screen action gets a sound; pitched sounds take their notes from the score's harmony.json,
camera whips get whooshes sized by the measured camera speed. Usage: sfx.py <events.json> <camspeed.json> <harmony.json> <out.wav>"""
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.join(os.environ.get('LIB', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../..'))), 'core/audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, whoosh, thump, click, step, add

ev = json.load(open(sys.argv[1]))['ev']; cam = json.load(open(sys.argv[2])); HAR = json.load(open(sys.argv[3]))
DUR = float(os.environ.get("DUR", 30.0)); N = int(DUR * SR); out = np.zeros((N, 2))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def chord(t):
    b = max(0, min(len(HAR) - 1, int(t // 2))); return HAR[b]['notes']
def note(t, deg, octv=1):   # the deg-th chord tone at time t, octave-shifted
    ns = sorted(n % 12 + 60 for n in chord(t)); return ns[deg % len(ns)] + 12 * (octv + deg // len(ns))

def marimba(f, d=.7, v=1.0):
    tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * env_exp(d, .28) + .3 * np.sin(2 * np.pi * f * 3.93 * tt) * env_exp(d, .045) + .1 * np.sin(2 * np.pi * f * 9.2 * tt) * env_exp(d, .01)
    return norm(x + hp(noise(d), 3000) * env_exp(d, .002) * .25) * v
def bell(f, d=1.2, v=1.0):
    tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * r * tt) * env_exp(d, tau) for r, a, tau in [(1, 1, .5), (2.01, .45, .3), (3.0, .25, .18), (4.2, .15, .1)])
    return norm(x) * v
def blip(f, d=.12, v=1.0):
    tt = t_(d); return norm(np.sin(2 * np.pi * f * tt) * env_exp(d, .025) * (1 - np.exp(-tt / .002))) * v
def poppy(f0=500, f1=1400, d=.16, v=1.0):
    tt = t_(d); f = f0 + (f1 - f0) * tt / d; return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .045)) * v
def boing(v=1.0):
    d = .6; tt = t_(d); f = 180 + 260 * np.exp(-tt / .25) * (1 + .5 * np.sin(2 * np.pi * 14 * tt) * np.exp(-tt / .2))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .2)) * v
def rise(d, v=1.0, lo=300, hi=3000):
    tt = t_(d); n = noise(d); o = np.zeros_like(n)
    for i in range(0, len(n), 480):
        f = lo * (hi / lo) ** (i / len(n)); seg = bp(n[max(0, i - 2000):i + 480], f * .8, f * 1.25); o[i:i + 480] = seg[-len(o[i:i + 480]):]
    return norm(o) * (tt / d) ** 1.5 * v
def fall(d=.35, v=1.0):   # descending whistle for things dropping from above
    tt = t_(d); f = 1800 * (1 - .7 * tt / d); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2) * v
def crumble(d=.4, v=1.0, n=26, pitch=1.0):
    o = np.zeros(int((d + .1) * SR)); r = np.random.default_rng(int(d * 1000 + n))
    for k in range(n):
        c = click(pitch * (.7 + r.random() * .8), .3 + r.random() * .7); s = int(r.random() ** 1.3 * d * SR); o[s:s + len(c)] += c[:len(o) - s]
    return norm(o) * v
def build(d=1.0, v=1.0, n=40):   # cubes stacking up: ticks rising in pitch
    o = np.zeros(int((d + .1) * SR))
    for k in range(n):
        c = click(.8 + k / n * 1.2, .5); s = int(k / n * d * SR); o[s:s + len(c)] += c[:len(o) - s]
    return norm(o) * v
def slam(v=1.0, f=55):
    d = 1.2; tt = t_(d)
    sub = np.sin(2 * np.pi * f * tt * (1 - .2 * tt)) * env_exp(d, .22)
    body = lp(noise(d), 500) * env_exp(d, .06); crack = hp(noise(d), 2500) * env_exp(d, .012)
    paper = bp(noise(d), 1500, 7000) * env_exp(d, .25) * .25
    return norm(sub + body * .8 + crack * .5 + paper) * v
def stampS(v=1.0):
    d = .5; tt = t_(d); return norm(lp(noise(d), 900) * env_exp(d, .03) + np.sin(2 * np.pi * 90 * tt) * env_exp(d, .07) + hp(noise(d), 3000) * env_exp(d, .006) * .6) * v
def swish(d=.3, v=1.0):
    return norm(bp(noise(d), 2000, 8000) * np.sin(np.pi * t_(d) / d) ** 2) * v
def key(v=1.0):
    d = .05; tt = t_(d); return norm(hp(noise(d), 2000) * env_exp(d, .004) + np.sin(2 * np.pi * 3200 * tt) * env_exp(d, .003) * .4) * v

R = np.random.default_rng(5)
q16 = lambda t: round(t * 8) / 8
used = set()
def onslot(kind, t):
    k = (kind, round(t * 8))
    if k in used: return None
    used.add(k); return q16(t)
def wrong(v=1.0):
    """the film's one 'bad' sound (failures and the verdict): a muted low two-note fall, F3 → E3, a semitone that isn't in D major's I chord"""
    o = np.zeros(int(.6 * SR))
    for k, (f, s0, d) in enumerate([(174.6, 0, .16), (164.8, .14, .42)]):
        tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * h * tt) for h, a in [(1, 1), (2, .5), (3, .32), (4, .18), (5, .1)])
        x = lp(x * env_exp(d, .16 if k else .07) * (1 - np.exp(-tt / .006)), 1400)
        i = int(s0 * SR); o[i:i + len(x)] += x[:len(o) - i]
    return norm(o) * v
def buzz(d, v=1.0):   # moth wings: a soft fluttering noise, amplitude-modulated at wing rate
    tt = t_(d); return norm(bp(noise(d), 300, 2400) * (.5 + .5 * np.sin(2 * np.pi * 26 * tt)) ** 2) * v
for e in sorted(ev, key=lambda e: e['t']):
    t, ty = e['t'], e['type']; pan = float(R.uniform(-.3, .3)); k = e.get('k', 0)
    if ty == 'pop': g = 1.2 if e.get('big') else 1.0; add(out, marimba(hz(note(q16(t), k % 7, 0)), .5, .25 * g), q16(t), 1, pan); add(out, poppy(400 + 40 * (k % 7), 1300, .12, .12 * g), t, 1, pan)
    elif ty == 'hop': add(out, swish(.12, .05), t, 1, pan); add(out, blip(hz(note(q16(t), k % 3, 1)), .08, .06), q16(t), 1, pan)
    elif ty == 'jump': add(out, swish(.3, .1), t, 1, pan); add(out, rise(.45, .05, 500, 2400), t, 1)
    elif ty == 'land': add(out, thump(.3 * e.get('v', 1), 105), t, 1); add(out, step(.1 * e.get('v', 1)), t, 1, pan)
    elif ty == 'select': add(out, click(1.0, .16), t, 1, .1); add(out, blip(hz(note(t, k + 1, 2)), .1, .07), t + .02, 1, .1)
    elif ty == 'swipe': add(out, swish(.25, .07), t, 1, .2)
    elif ty == 'held': add(out, bell(hz(note(t, 0, 2)), .9, .12), t, 1, .2); add(out, bell(hz(note(t, 2, 2)), .9, .1), t + .12, 1, .2)
    elif ty == 'stamp': add(out, stampS(.5), t, 1); add(out, slam(.35, 60), t, 1); add(out, crumble(.2, .05, 10, 1.3), t + .02, 1)
    elif ty == 'paid': [add(out, bell(hz(note(t, j, 2)), 1.0, .1), t + j * .08, 1, .2) for j in range(3)]
    elif ty == 'coin': add(out, blip(hz(note(t, k % 3, 3)), .06, .035), t, 1, -.3 + k * .07); add(out, click(1.5, .08), t, 1, -.3 + k * .07)
    elif ty == 'tick': add(out, click(1.2 + .04 * k, .07), t, 1, .2)
    elif ty == 'fly': add(out, rise(.6, .06, 600, 2500), t, 1, .3); add(out, swish(.5, .07), t, 1, .3)
    elif ty == 'tap': add(out, click(1.0, .18), t, 1, .3)
    elif ty == 'ring': add(out, bell(hz(note(t, 2, 2)), 1.4, .22), t, 1, .3); add(out, bell(hz(note(t, 0, 2)), 1.4, .16), t + .08, 1, .3); add(out, bell(hz(note(t, 2, 2)), 1.0, .1), t + .26, 1, .3)
    elif ty == 'flatten': add(out, poppy(1300, 420, .25, .1), t, 1, -.1); add(out, thump(.2, 120), t + .32, 1)
    elif ty == 'booked': add(out, marimba(hz(note(q16(t), 2, 1)), .6, .2), q16(t), 1, -.1)
    elif ty == 'paidStamp': add(out, stampS(.22), t, 1, -.1); add(out, blip(hz(note(t, 0, 3)), .1, .05), t + .03, 1, -.1)
    elif ty == 'drop': add(out, fall(.25, .1), t, 1)
    elif ty == 'titleLand': add(out, thump(.55, 75), t, 1); add(out, step(.18), t, 1); add(out, bell(hz(note(t, 0, 2)), 1.6, .14), t + .02, 1, 0); add(out, bell(hz(note(t, 2, 2)), 1.4, .09), t + .1, 1, 0)
# a faint room tone with a slow clock tick under the night opening (ambience layer)
rt = lp(noise(DUR), 400) * .006; out[:len(rt)] += rt[:, None]
for i in range(0, 10): add(out, click(.6, .025), .25 + i * 1.0, 1, .5)
# camera whips: one whoosh per burst of fast motion, length and level from the measured speed
sp = np.array([c[1] + .25 * c[2] for c in cam]); ts = np.array([c[0] for c in cam]); i = 0
while i < len(sp):
    if sp[i] > .9:
        j = i
        while j < len(sp) and sp[j] > .5: j += 1
        a = max(0, i - 4); pk = sp[i:j].max(); d = max(.25, (j - a) / 30 + .1)
        add(out, whoosh(d, min(.7, .18 + pk * .14)), ts[a], 1, float(R.uniform(-.4, .4))); i = j + 3
    else: i += 1

out *= .9
peak = np.abs(out).max(); print('sfx peak', round(peak, 3))
if peak > .98: out *= .98 / peak
import wave
with wave.open(sys.argv[4], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype('<i2').tobytes())
print('wrote', sys.argv[4])
