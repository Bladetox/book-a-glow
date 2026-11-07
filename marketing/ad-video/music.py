"""Synthesises the ad's original soundtrack + sound effects.

    python3 music.py           -> out/music.wav        (variant A, 20 s)
    python3 music.py 30        -> out/music-30s.wav    (variant A, 30 s)
    python3 music.py b 30      -> out/music-b-30s.wav  (variant B, 30 s; also c, d)

Cue times below are written on the 20-second timeline of ad.html and scaled
by S for longer cuts; the groove keeps a real 120 BPM at any length.
"""
import os
import wave

import sys

import numpy as np

SR = 44100
ARGS = sys.argv[1:]
VARIANT = ARGS.pop(0).lower() if ARGS and ARGS[0].isalpha() else "a"
DUR = float(ARGS[0]) if ARGS else 20.0
S = DUR / 20.0          # timeline stretch
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    """Place a sound at `at` seconds on the 20-second timeline (scaled by S)."""
    i = int(at * S * SR)
    if i >= N or i < 0:
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


# ── shared building blocks ──
def groove(start, end=19.3):
    """Warm 120 BPM groove (Cmaj7 G Am F) from `start` to `end` on the timeline."""
    beat = 0.5 / S                       # beat in timeline units = 0.5 s real
    prog = [[60, 64, 67, 71], [55, 59, 62, 67], [57, 60, 64, 67], [53, 57, 60, 64]]
    roots = [36, 43, 45, 41]
    bar, tt = 0, start
    while tt < end:
        ch = prog[bar % 4]
        add(pad([note(m) for m in ch], 2.05), tt, 0.10)
        add(bass(note(roots[bar % 4]), 1.9), tt, 0.22)
        for b in range(4):
            bt = tt + b * beat
            if bt >= end:
                break
            add(kick(), bt, 0.55)
            add(hat(0.7), bt + beat / 2, 0.16, pan=0.25)
            if b in (1, 3):
                add(hat(0.9, 18), bt, 0.10, pan=-0.2)   # soft snare-ish noise
        tt += 4 * beat
        bar += 1


def transitions(times):
    for at in times:
        add(whoosh(0.4), at - 0.15, 0.22)


def phone_flow(t0):
    """Taps and the "You're booked!" chime for the shared booking-page scene."""
    for off in (0.85, 1.85, 2.3, 3.1):
        add(click(), t0 + off, 0.45)
    for k, m in enumerate((76, 79, 84)):
        add(bell(note(m), 1.0), t0 + 3.4 + k * 0.08, 0.22)


def photo_cuts(t0):
    for i in range(4):
        add(hat(1.0, 25), t0 + 0.1 + i * 0.5, 0.18)


def outro():
    for k, m in enumerate((72, 76, 79, 84)):  # CTA arpeggio
        add(bell(note(m), 1.4), 18.8 + k * 0.07, 0.2)
    add(pad([note(m) for m in (48, 60, 64, 67, 72)], 1.6 * S), 19.3, 0.12)   # final chord rings out


SCENES = (5.9, 9.95, 12.75, 15.9, 17.95)

if VARIANT == "a":
    # ── A · DM chaos: tense ticking intro, then the groove ──
    # (kept literally as first written so A's soundtrack is unchanged)
    t = t_axis(3.4 * S)
    drone = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t)) * env(len(t), 0.4, 0.3)
    add(drone, 0, 0.18)
    for i in range(13):                       # ticking clock
        add(hat(0.5, 70), 0.1 + i * 0.25, 0.35, pan=0.3 if i % 2 else -0.3)
    for i in range(6):                        # message bubbles
        add(pop(700 + i * 90), 0.45 + i * 0.32, 0.35, pan=(-0.4, 0.4)[i % 2])
    add(thud(), 2.45, 0.9)                    # NO-SHOW stamp
    add(whoosh(0.5), 2.95, 0.5)               # into the wipe
    groove(3.35)
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
    outro()

elif VARIANT == "b":
    # ── B · No-shows cost you: a darker ticking intro, a "loss" hit per missed week ──
    t = t_axis(3.4 * S)
    drone = (np.sin(2 * np.pi * 49 * t) + 0.5 * np.sin(2 * np.pi * 73.4 * t)) * env(len(t), 0.4, 0.3)
    add(drone, 0, 0.2)
    for i in range(13):
        add(hat(0.5, 70), 0.1 + i * 0.25, 0.3, pan=0.3 if i % 2 else -0.3)
    for i in range(4):                        # each no-show lands
        a = 0.55 + i * 0.4
        add(thud(), a + 0.1, 0.45)
        tl = t_axis(0.35)
        add(np.sin(2 * np.pi * np.cumsum(520 - 260 * tl / 0.35) / SR) * np.exp(-tl * 7), a + 0.15, 0.12)
    add(whoosh(0.5), 2.95, 0.5)
    groove(3.35)
    add(thud(), 3.35, 0.5)
    add(bell(note(84)), 3.4, 0.18)
    transitions(SCENES)
    phone_flow(5.9)
    add(click(), 9.95 + 1.55, 0.5)            # tick the policy box
    add(bell(note(84), 0.8), 9.95 + 1.68, 0.14)
    add(click(), 9.95 + 2.1, 0.35)            # pay button
    add(bell(note(88), 0.8), 12.75 + 1.47, 0.16)   # deposit toast
    for i, m in enumerate((72, 76, 79, 84)):  # weeks flip to "deposit paid"
        add(bell(note(m), 0.7), 15.9 + 0.4 + i * 0.17, 0.12)
    outro()

elif VARIANT == "c":
    # ── C · Booked while you sleep: night pad and notification pings ──
    add(pad([note(m) for m in (45, 52, 57, 60, 64)], 3.4 * S), 0, 0.09)
    for at, m in ((0.2, 96), (0.95, 100), (1.75, 98), (2.5, 101)):   # faint twinkles
        add(bell(note(m), 0.9), at, 0.035, pan=0.4 if m % 2 else -0.4)
    for at in (0.55, 1.3, 2.05):              # mail notification: two-tone ping
        add(bell(note(88), 0.7), at, 0.2)
        add(bell(note(93), 0.8), at + 0.09, 0.18)
    add(whoosh(0.5), 2.95, 0.45)
    groove(3.35)
    add(thud(), 3.35, 0.45)
    add(bell(note(84)), 3.4, 0.18)
    transitions(SCENES)
    phone_flow(5.9)
    for i in range(4):                        # bookings appear in the day view
        add(pop(820 + i * 80), 9.95 + 0.65 + i * 0.25, 0.25)
    add(bell(note(86), 0.8), 9.95 + 1.85, 0.14)    # Google Calendar synced
    for i, m in enumerate((76, 79, 83, 88)):  # checklist ticks
        add(bell(note(m), 0.7), 12.75 + 0.85 + i * 0.4, 0.14)
    photo_cuts(15.9)
    outro()

elif VARIANT == "d":
    # ── D · Everything in one app: groove from the first frame, a hit per word ──
    groove(0.0)
    for a in (0, 0.68, 1.38, 2.08, 2.78):     # each word slams in
        add(whoosh(0.25), max(0.0, a - 0.08), 0.22)
        add(thud(), a + 0.06, 0.5)
    add(bell(note(84)), 3.4, 0.18)            # logo
    add(pop(900), 3.25 + 1.75, 0.3)           # offer pill
    transitions(SCENES)
    for i in range(6):                        # feature tiles
        add(pop(760 + i * 70), 5.9 + 0.55 + i * 0.22, 0.22, pan=(-0.3, 0.3)[i % 2])
    add(bell(note(88), 0.8), 9.95 + 1.47, 0.16)    # deposit toast
    for i in range(3):                        # plan cards
        add(pop(700 + i * 120), 12.75 + 0.55 + i * 0.28, 0.24)
    add(bell(note(84), 0.8), 12.75 + 1.6, 0.14)
    photo_cuts(15.9)
    outro()

else:
    sys.exit(f"unknown variant {VARIANT!r}; use a, b, c or d")

# ── master ──
mix = np.stack([L, R], axis=1)
fade = np.ones(N)
fade[int(19.2 * S * SR):] = np.linspace(1, 0, N - int(19.2 * S * SR)) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)  # gentle glue
mix *= 0.89 / np.max(np.abs(mix))        # peak ≈ -1 dBFS
os.makedirs("out", exist_ok=True)
name = "out/music" + ("" if VARIANT == "a" else f"-{VARIANT}") + ("" if DUR == 20 else f"-{int(DUR)}s") + ".wav"
with wave.open(name, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", name, mix.shape[0] / SR, "s")
