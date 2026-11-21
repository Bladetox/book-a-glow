"""Score for NextSlot · "11 pm" (Tabletop App Flythrough). 30 s, 120 BPM, F major, a bar = 2 s from 0.0, 15 bars.
Cue map (TREATMENT.md §6): bars 1–2 night (vibraphone and pad only); the client pops at 2.5 and the marimba enters; plucked bass and
shaker under the booking; the bed drops out for the half beat before the stamp (10.15–10.5); claps join for the payment run and the bell;
the melody resolves over the diary; a second near-silence before the title card (22.5–23.0); the full mallet theme and the final chord
over the title. Run from the library root:  .venv/bin/python -I <film>/audio/compose.py"""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..')); LIB = os.environ['LIB']
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio import sampler as S
from core.audio.sfx import SR, add, t_, env_exp

S.seed(23)
DUR = json.load(open(os.path.join(ROOT, 'vo/timeline.json')))['dur']
BAR = 2.0; BEAT = .5
CH = ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C', 'Bb', 'F', 'Gm', 'C', 'F', 'Bb', 'F']
PAD = {'F': ['A3', 'C4', 'F4'], 'Dm': ['A3', 'D4', 'F4'], 'Bb': ['Bb3', 'D4', 'F4'], 'C': ['G3', 'C4', 'E4'], 'Gm': ['G3', 'Bb3', 'D4']}
ROOT_ = {'F': 'F2', 'Dm': 'D2', 'Bb': 'Bb1', 'C': 'C2', 'Gm': 'G2'}
THEME = {11: [(0, 'C6', 1), (1, 'A5', .5), (1.5, 'C6', .5), (2, 'F6', 1.5), (3.5, 'E6', .5)],
         12: [(0, 'D6', 1), (1, 'C6', .5), (1.5, 'A5', .5), (2, 'C6', 2)],
         13: [(0, 'D6', 1), (1, 'F6', 1), (2, 'E6', .5), (2.5, 'D6', .5), (3, 'C6', 1)],
         14: [(0, 'F6', 3)]}
RESOLVE = {8: [(0, 'D6', 1), (1, 'C6', 1), (2, 'Bb5', 2)], 9: [(0, 'A5', 1), (1, 'C6', 1), (2, 'F6', 2)]}
ev = []
def E(t, inst, p, d, v, pan=0., **kw): ev.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **kw))
STAMP, TITLE = 10.5, 23.0
quiet = lambda t: 10.15 <= t < STAMP or 22.5 <= t < TITLE
for b, ch in enumerate(CH):
    t0 = b * BAR
    if b < 11:   # the pad (stops for the title, where the final chord takes over)
        for i, p in enumerate(PAD[ch]): E(t0, 'violas' if i else 'cellos', p, BAR + .1, .2 if b > 1 else .26, [-.3, 0, .3][i], attack=.4, release=.6)
    if b < 2:    # night: slow vibraphone arpeggio
        for k, p in enumerate(PAD[ch]): E(t0 + k * BEAT * 1.3, 'vibraphone', S.name(S.midi(p) + 12), 1.2, .34, -.1 + .1 * k)
    if b in RESOLVE:
        for bt, n, d in RESOLVE[b]: E(t0 + bt * BEAT, 'marimba', n, max(.2, d * BEAT), .62, .05); (d >= 2) and E(t0 + bt * BEAT, 'vibraphone', n, d * BEAT, .26, -.1)
    elif b in THEME:
        for bt, n, d in THEME[b]:
            if quiet(t0 + bt * BEAT): continue
            E(t0 + bt * BEAT, 'marimba', n, max(.2, d * BEAT), .74, .05); (d >= 1.5) and E(t0 + bt * BEAT, 'vibraphone', n, d * BEAT, .3, -.1)
    elif 1 <= b < 11:   # marimba ostinato on 8ths from the pop, chord tones, soft (ducked under the voice)
        tones = sorted(S.midi(p) + 12 for p in PAD[ch])
        for k in range(8):
            t = t0 + k * BEAT / 2
            if t < 2.5 or quiet(t): continue
            E(t, 'marimba', S.name(tones[[0, 2, 1, 2, 0, 2, 1, 2][k]] + (12 if k == 4 else 0)), .3, .34 + (.06 if k % 4 == 0 else 0), .15)
    if 2 <= b < 11:   # plucked bass and shaker
        for k in (0, 2, 3):
            t = t0 + k * BEAT
            if not quiet(t): E(t, 'contrabass_pizz', ROOT_[ch] if k != 3 else S.name(S.midi(ROOT_[ch]) + 7), .4, .7 if k == 0 else .52)
        for k in range(8):
            t = t0 + k * BEAT / 2
            if not quiet(t): E(t, 'shaker', 'down' if k % 2 == 0 else 'up', None, .16 + (.06 if k % 2 == 0 else 0), .35)
    if 5 <= b < 8:
        for k in (1, 3):
            t = t0 + k * BEAT
            if t >= STAMP: E(t, 'claps', 'solo', None, .34, -.2)
# hits on the picture
E(2.5, 'glockenspiel', 'C6', 1.0, .38, .2)                                 # the pop
E(STAMP, 'timpani', 'F2', 1.2, .55); E(STAMP, 'cellos_pizz', 'F3', .4, .55)   # the stamp
for k, p in enumerate(['F5', 'A5', 'C6']): E(10.75 + k * .1, 'glockenspiel', p, .7, .3, .2)   # paid
E(13.7, 'glockenspiel', 'E6', 1.0, .34, .2)                                # the banner
E(18.15, 'glockenspiel', 'A6', 1.0, .34, .2)                               # booked
E(TITLE, 'timpani', 'F2', 2.5, .45); E(TITLE, 'sus_cymbal', 'hit', None, .22)
for p in ['F4', 'A4', 'C5', 'F5']: E(TITLE, 'vibraphone', p, DUR - TITLE - .5, .26)
for p in ['F3', 'C4']: E(TITLE, 'horn', p, DUR - TITLE - .5, .24, 0, attack=.3, release=.6)
E(TITLE, 'contrabass', 'F2', DUR - TITLE - .5, .36, 0, attack=.2, release=.6)
for k, p in enumerate(['C6', 'F6', 'A6']): E(20.5 + k * .25, 'glockenspiel', p, .7, .28, -.3 + .3 * k)   # the curtain-call hops
mus = S.render(ev, dur=DUR)
def kick(v):
    d = .22; tt = t_(d); f = 60 + 70 * np.exp(-tt / .03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .07) * v).astype(np.float32)
for b in range(2, 11):
    for k in (0, 2):
        t = b * BAR + k * BEAT
        if not quiet(t): add(mus, kick(.34 if k == 0 else .24), t, 1, 0)
for t in (2.5, STAMP, TITLE): add(mus, kick(.5), t, 1, 0)
mus = S.room(mus, size=.3, mix=.12)
fade = int(.4 * SR); mus[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
mus *= .5 / max(1e-9, np.abs(mus).max())
os.makedirs(os.path.join(ROOT, 'music'), exist_ok=True)
sf.write(os.path.join(ROOT, 'music/score.wav'), mus[:int(DUR * SR)], SR, subtype='PCM_24')
json.dump([{'bar': b, 't0': b * BAR, 'chord': ch, 'notes': [S.midi(p) for p in PAD[ch]], 'root': S.midi(ROOT_[ch])} for b, ch in enumerate(CH)], open(os.path.join(ROOT, 'music/harmony.json'), 'w'))
print('score', mus.shape)
print(S.credits(sorted({e['inst'] for e in ev})))
