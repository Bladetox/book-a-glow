"""Synthesises the ad's original soundtrack + sound effects -> out/music.wav (20 s, 44.1 kHz stereo).

Cue times match the animation timeline in ad.html.
"""
import os
import wave

import numpy as np

SR, DUR = 44100, 20.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - pan) * 0.5 + sig * 0.5 * (pan <= 0)
    R[i:i + len(sig)] += sig * (1 + pan) * 0.5 + sig * 0.5 * (pan >= 0)


def env(n, a, d):
    e = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nd:
        e[-nd:] *= np.linspace(1, 0, nd)
    return e


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")


def note(f):
    return 440.0 * 2 ** ((f - 69) / 12)


# ── instruments ──
def kick(g=1.0):
    t = t_axis(0.35)
    f = 110 * np.exp(-t * 18) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * g


def hat(g=1.0, dec=40):
    t = t_axis(0.08)
    n = rng.standard_normal(len(t))
    n = n - lowpass(n, 6)
    return n * np.exp(-t * dec) * g


def pop(f=900):
    t = t_axis(0.12)
    return np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t * 40))) * np.exp(-t * 32)


def click():
    t = t_axis(0.05)
    return (np.sin(2 * np.pi * 2200 * t) * 0.6 + rng.standard_normal(len(t)) * 0.2) * np.exp(-t * 90)


def thud():
    t = t_axis(0.6)
    f = 70 * np.exp(-t * 6) + 35
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    n = lowpass(rng.standard_normal(len(t)), 40) * np.exp(-t * 14) * 2
    return body + n


def whoosh(dur=0.45, rise=True):
    t = t_axis(dur)
    n = rng.standard_normal(len(t))
    shape = np.sin(np.pi * t / dur) ** 2
    if rise:
        shape *= np.linspace(0.3, 1, len(t))
    bright = n - lowpass(n, 12)
    return (lowpass(n, 8) * 0.6 + bright * 0.4) * shape


def bell(f, dur=1.2):
    t = t_axis(dur)
    s = sum(np.sin(2 * np.pi * f * m * t) * a * np.exp(-t * (3 + m)) for m, a in [(1, 1), (2.01, .35), (3.02, .15)])
    return s * env(len(t), 0.004, 0.05)


def pad(freqs, dur):
    t = t_axis(dur)
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.12, 0.12):
            s += np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6)) + 0.25 * np.sin(2 * np.pi * 2 * (f + det) * t)
    return lowpass(s / len(freqs), 6) * env(len(t), 0.25, 0.35)


def bass(f, dur):
    t = t_axis(dur)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * env(len(t), 0.01, 0.12)


# ── 0–3.3 s: tense intro under the DM chaos ──
t = t_axis(3.4)
drone = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t)) * env(len(t), 0.4, 0.3)
add(drone, 0, 0.18)
for i in range(13):                       # ticking clock
    add(hat(0.5, 70), 0.1 + i * 0.25, 0.35, pan=0.3 if i % 2 else -0.3)
for i in range(6):                        # message bubbles
    add(pop(700 + i * 90), 0.45 + i * 0.32, 0.35, pan=(-0.4, 0.4)[i % 2])
add(thud(), 2.45, 0.9)                    # NO-SHOW stamp
add(whoosh(0.5), 2.95, 0.5)               # into the wipe

# ── 3.35 s onwards: warm groove, 120 BPM ──
start, beat = 3.35, 0.5
prog = [[60, 64, 67, 71], [55, 59, 62, 67], [57, 60, 64, 67], [53, 57, 60, 64]]   # Cmaj7 G Am F
roots = [36, 43, 45, 41]
bar = 0
tt = start
while tt < 19.3:
    ch = prog[bar % 4]
    add(pad([note(m) for m in ch], 2.05), tt, 0.10)
    add(bass(note(roots[bar % 4]), 1.9), tt, 0.22)
    for b in range(4):
        bt = tt + b * beat
        if bt >= 19.3:
            break
        add(kick(), bt, 0.55)
        add(hat(0.7), bt + beat / 2, 0.16, pan=0.25)
        if b in (1, 3):
            add(hat(0.9, 18), bt, 0.10, pan=-0.2)   # soft snare-ish noise
    tt += 2.0
    bar += 1

add(thud(), 3.35, 0.5)                    # reveal impact
add(bell(note(84)), 3.4, 0.18)
for at in (5.9, 9.95, 12.75, 15.9, 17.95):  # scene transitions
    add(whoosh(0.4), at - 0.15, 0.22)
for at in (6.75, 7.75, 8.2, 9.0):         # taps in the booking page
    add(click(), at, 0.45)
for k, m in enumerate((76, 79, 84)):      # "You're booked!" chime
    add(bell(note(m), 1.0), 9.3 + k * 0.08, 0.22)
add(bell(note(88), 0.8), 11.42, 0.16)     # deposit toast
add(bell(note(81), 0.8), 14.58, 0.16)     # Nexty card
for i in range(4):                        # photo cuts
    add(hat(1.0, 25), 16.0 + i * 0.5, 0.18)
for k, m in enumerate((72, 76, 79, 84)):  # CTA arpeggio
    add(bell(note(m), 1.4), 18.8 + k * 0.07, 0.2)
add(pad([note(m) for m in (48, 60, 64, 67, 72)], 1.6), 19.3, 0.12)   # final chord rings out

# ── master ──
mix = np.stack([L, R], axis=1)
fade = np.ones(N)
fade[int(19.2 * SR):] = np.linspace(1, 0, N - int(19.2 * SR)) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)  # gentle glue
mix *= 0.89 / np.max(np.abs(mix))        # peak ≈ -1 dBFS
os.makedirs("out", exist_ok=True)
with wave.open("out/music.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote out/music.wav", mix.shape[0] / SR, "s")
