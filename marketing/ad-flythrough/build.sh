#!/bin/sh
# One command: NextSlot · "11 pm" (Tabletop App Flythrough), vertical 1080×1920, 30 fps, 30 s → nextslot-11pm.mp4
#   LIB=/path/to/lemo-opuscar sh marketing/ad-flythrough/build.sh
# Steps: voice (Kokoro, offline) → voice clock → events → score, foley, mix → picture → master (two-pass loudnorm, −14 LUFS) → reading-time check → poster.
# Needs the Lemo-Opuscar library (github.com/lemomo-ai/lemo-opuscar, MIT) with its venv, voice model and CC0 sample packs (tools/fetch.sh),
# Node 20+, ffmpeg and Python 3.11+. Without a GPU set LEMO_ANGLE=swiftshader (software WebGL; slow).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
[ -n "$LIB" ] && [ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
export LIB
PY="$LIB/.venv/bin/python"; SIZE=1080x1920; FPS=30; N=${N:-2}; NAME=nextslot-11pm
cd "$LIB"; mkdir -p "$HERE/out"

# voice: American English (Kokoro af_heart); the starts are fixed by the beat sheet (audio/vo_timeline.py)
"$PY" core/tts/tts.py "$HERE/vo/lines.json" "$HERE/vo"
"$PY" core/tts/asr_check.py "$HERE/vo/lines.json" "$HERE/vo" --lang en || echo "speech check skipped or failed: listen to vo/*.wav"
python3 "$HERE/audio/vo_timeline.py"
export DUR=30.0

# events and camera speed from the page, then the score, the foley and the mix (about −16 LUFS before the master)
node core/render/events.mjs "$HERE" --size $SIZE --out "$HERE/out/events.json"
node "$HERE/tools/camspeed.mjs" "$HERE/out/camspeed.json"
"$PY" -I "$HERE/audio/compose.py"
"$PY" -I "$HERE/audio/foley.py" "$HERE/out/events.json" "$HERE/out/camspeed.json" "$HERE/music/harmony.json" "$HERE/out/sfx.wav"
"$PY" -I "$HERE/audio/mix.py" "$HERE/music/score.wav" "$HERE/out/sfx.wav" "$HERE/out/mix.wav" -4

# picture, then the master
node core/render/video.mjs "$HERE" --fps $FPS --workers 3 --size $SIZE --q n=$N --out "$HERE/out/video.mp4"
sh "$HERE/tools/master.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4"

# reading time of the words in the world (window.TEXTS), subtitles file, poster
node core/render/readcheck.mjs "$HERE" --size $SIZE > "$HERE/out/readcheck.txt" && echo "readcheck ok" || { tail -20 "$HERE/out/readcheck.txt"; exit 1; }
python3 "$HERE/tools/srt.py" "$HERE/vo/timeline.json" "$HERE/subtitles_en.srt"
ffmpeg -v error -y -ss 28.5 -i "$HERE/$NAME.mp4" -frames:v 1 -q:v 2 "$HERE/poster.jpg"
echo "done: $HERE/$NAME.mp4"
