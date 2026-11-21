"""score.py <ad>: original 120 BPM score for one ad (30 s), written to out/<ad>/score.wav.
A motorik grid (soft kick on beats, shaker eighths, plucked bass eighths) under a marimba ostinato in sixteenths; each ad has its own key and
progression. The drums drop out for the bar before the end card (a near-silent bar), then a final chord rings under the end card.
Samples: VCSL and VSCO2 CE (CC0) through the Lemo-Opuscar sampler. Run with the library venv: LIB=... python -I audio/score.py a1"""
import sys, os, json
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio import sampler as S
from core.audio.sfx import SR, add, t_, env_exp
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = sys.argv[1]
TL = json.load(open(f'{ROOT}/vo/{A}/timeline.json')); END = TL['end']; DUR = 30.0
BEAT = .5; BAR = 2.0
KEYS = {   # chord per bar (2 s): triads as note names; bass root
  'a1': (['Am', 'F', 'C', 'G'], 11), 'a2': (['Dm', 'Bb', 'F', 'C'], 12), 'a3': (['Em', 'C', 'G', 'D'], 13), 'a4': (['C', 'G', 'Am', 'F'], 14), 'a5': (['F', 'C', 'Dm', 'Bb'], 15)}
CH = {'Am': ['A3', 'C4', 'E4'], 'F': ['F3', 'A3', 'C4'], 'C': ['G3', 'C4', 'E4'], 'G': ['G3', 'B3', 'D4'], 'Dm': ['A3', 'D4', 'F4'], 'Bb': ['Bb3', 'D4', 'F4'],
      'Em': ['G3', 'B3', 'E4'], 'D': ['A3', 'D4', 'F#4']}
RT = {'Am': 'A1', 'F': 'F1', 'C': 'C2', 'G': 'G1', 'Dm': 'D2', 'Bb': 'Bb1', 'Em': 'E2', 'D': 'D2'}
prog, seed = KEYS[A]; S.seed(seed)
ev = []
def E(t, inst, p, d, v, pan=0., **kw): ev.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **kw))
quiet0 = END - BAR   # the bar before the end card: drums and bass out, marimba thins
PAT = [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 2, 1, 2, 1]
for b in range(15):
    t0 = b * BAR; ch = prog[b % 4]
    if t0 >= END: break
    tones = sorted(S.midi(p) + 12 for p in CH[ch])
    for k in range(16):
        t = t0 + k * BEAT / 4
        if t >= END - .02: break
        if quiet0 <= t and k % 4: continue
        if b == 0 and k % 2: continue   # the first bar builds: eighths only
        E(t, 'marimba', S.name(tones[PAT[k]] + (12 if k in (4, 12) else 0)), .22, .3 + (.08 if k % 4 == 0 else 0), .12)
    if t0 + BAR <= quiet0 + .01:
        for k in range(4 if b == 0 else 8):
            t = t0 + k * BEAT / 2 * (2 if b == 0 else 1)
            E(t, 'contrabass_pizz', RT[ch] if k % 4 != 3 else S.name(S.midi(RT[ch]) + 7), .3, .6 if k % 2 == 0 else .45)
        if b >= 1:
            for k in range(8): E(t0 + k * BEAT / 2, 'shaker', 'down' if k % 2 == 0 else 'up', None, .15 + (.05 if k % 2 == 0 else 0), .3)
    for i, p in enumerate(CH[ch]): E(t0, 'violas' if i else 'cellos', p, BAR + .1, .14, [-.3, 0, .3][i], attack=.3, release=.5)
# the end card: one chord, held
fin = CH[prog[0]]
for p in fin: E(END, 'vibraphone', S.name(S.midi(p) + 12), DUR - END - .3, .32)
E(END, 'contrabass', RT[prog[0]], DUR - END - .4, .34, attack=.1, release=.5)
E(END, 'glockenspiel', S.name(S.midi(fin[2]) + 24), 1.2, .34, .2)
mus = S.render(ev, dur=DUR)
def kick(v):
    d = .2; tt = t_(d); f = 58 + 72 * np.exp(-tt / .03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .06) * v).astype(np.float32)
for b in range(1, 15):
    for k in range(4):
        t = b * BAR + k * BEAT
        if t < quiet0: add(mus, kick(.34 if k % 2 == 0 else .22), t, 1, 0)
add(mus, kick(.5), END, 1, 0)
fade = int(.4 * SR); mus[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
mus *= .5 / max(1e-9, np.abs(mus).max())
os.makedirs(f'{ROOT}/out/{A}', exist_ok=True)
sf.write(f'{ROOT}/out/{A}/score.wav', mus[:int(DUR * SR)], SR, subtype='PCM_24')
print(A, 'score ok', S.credits(sorted({e['inst'] for e in ev})))
