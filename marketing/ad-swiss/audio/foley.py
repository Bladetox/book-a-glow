"""foley.py <ad>: print-shop foley from the page's events (out/<ad>/events.json) → out/<ad>/sfx.wav. Dry and close, no reverb.
tick: a small block set; snap: letterpress clack; clack: a heavier clack; thunk: a numeral landing; knife: a guillotine snick;
wipe: paper sliding; rise: a sine glide (the exception, the only element that sings); stamp: a rubber stamp."""
import sys, os, json
sys.path.insert(0, os.path.join(os.environ['LIB'], 'core/audio'))
import numpy as np
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, thump, click, add
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = sys.argv[1]
ev = json.load(open(f'{ROOT}/out/{A}/events.json'))['ev']; DUR = 30.0; out = np.zeros((int(DUR * SR), 2))
def snick(v):
    d = .14; tt = t_(d); return norm(hp(noise(d), 3500) * env_exp(d, .025) + np.sin(2 * np.pi * 2400 * tt) * env_exp(d, .01) * .3) * v
def slide(v):
    d = .3; return norm(bp(noise(d), 600, 3500) * np.sin(np.pi * t_(d) / d) ** 2) * v
def glide(v):
    d = .8; tt = t_(d); f = 440 * 2 ** (tt / d * 1.0); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** .7) * v
def stamp(v):
    d = .4; tt = t_(d); return norm(lp(noise(d), 800) * env_exp(d, .03) + np.sin(2 * np.pi * 85 * tt) * env_exp(d, .06) + hp(noise(d), 3000) * env_exp(d, .005) * .5) * v
R = np.random.default_rng(3)
for e in ev:
    t, ty = e['t'], e['type']; pan = float(R.uniform(-.25, .25))
    if ty == 'tick': add(out, click(1.3, .1), t, 1, pan)
    elif ty == 'snap': add(out, click(1.0, .2), t, 1, pan); add(out, thump(.12, 160), t, 1)
    elif ty == 'clack': add(out, click(.8, .26), t, 1, pan); add(out, thump(.2, 120), t, 1)
    elif ty == 'thunk': add(out, thump(.4, 80), t, 1); add(out, click(.6, .12), t, 1)
    elif ty == 'knife': add(out, snick(.16), t, 1, pan)
    elif ty == 'wipe': add(out, slide(.1), t - .15, 1, pan)
    elif ty == 'rise': add(out, glide(.1), t, 1, .2)
    elif ty == 'stamp': add(out, stamp(.32), t, 1)
out *= .9; pk = np.abs(out).max(); out *= min(1, .95 / max(pk, 1e-9))
import wave
with wave.open(f'{ROOT}/out/{A}/sfx.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype('<i2').tobytes())
print(A, 'sfx', len(ev), 'events')
