#!/bin/sh
# Build the five NextSlot "levels of awareness" ads (Swiss Motion, vertical 1080×1920, 30 fps, 30 s each):
#   LIB=/path/to/lemo-opuscar sh marketing/ad-swiss/build.sh [a1 a2 a3 a4 a5]
# Per ad: voice (Kokoro af_heart, offline) → clock → events → score → foley → mix → picture → master (−14 LUFS) → subtitles file → poster.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
[ -n "$LIB" ] && [ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
export LIB; PY="$LIB/.venv/bin/python"; ADS=${*:-a1 a2 a3 a4 a5}
NAME_a1=unaware-busy-is-not-paid; NAME_a2=problem-answer-this; NAME_a3=solution-later; NAME_a4=product-is-it-for-you; NAME_a5=most-aware-the-deal
cd "$LIB"
for A in $ADS; do
  eval N=\$NAME_$A; O="$HERE/out/$A"; mkdir -p "$O"
  [ -f "$HERE/vo/$A/v01.wav" ] || "$PY" core/tts/tts.py "$HERE/vo/$A/lines.json" "$HERE/vo/$A"
  python3 "$HERE/audio/vo_timeline.py" $A
  node core/render/events.mjs "$HERE" --size 1080x1920 --q ad=$A --out "$O/events.json"
  "$PY" -I "$HERE/audio/score.py" $A
  "$PY" -I "$HERE/audio/foley.py" $A
  DUR=30 "$PY" -I "$HERE/audio/mix.py" "$O/score.wav" "$O/sfx.wav" "$O/mix.wav" -3 $A
  node core/render/video.mjs "$HERE" --fps 30 --workers 3 --size 1080x1920 --q ad=$A --out "$O/video.mp4"
  sh "$HERE/tools/master.sh" "$O/video.mp4" "$O/mix.wav" "$HERE/nextslot-$A-$N.mp4"
  python3 "$HERE/tools/srt.py" "$HERE/vo/$A/timeline.json" "$HERE/subtitles/nextslot-$A-$N.srt"
  ffmpeg -v error -y -ss 27 -i "$HERE/nextslot-$A-$N.mp4" -frames:v 1 -q:v 2 "$HERE/posters/nextslot-$A.jpg"
done
