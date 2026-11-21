"""srt.py <timeline.json> <out.srt>: one cue per voice-over line, held like the burned-in subtitles (line + 0.6 s, at least 1.8 s)."""
import json, sys
L = json.load(open(sys.argv[1]))['lines']
f = lambda t: '%02d:%02d:%02d,%03d' % (t // 3600, t % 3600 // 60, t % 60, round(t % 1 * 1000) % 1000)
out = []
for i, l in enumerate(L):
    a = l['t0'] - .12; b = max(l['t1'] + .6, l['t0'] + 1.8)
    if i + 1 < len(L): b = min(b, L[i + 1]['t0'] - .12)
    out.append(f"{i + 1}\n{f(a)} --> {f(b)}\n{l['sub']}\n")
open(sys.argv[2], 'w').write('\n'.join(out)); print('wrote', sys.argv[2], len(out), 'cues')
