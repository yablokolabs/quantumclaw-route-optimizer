#!/usr/bin/env bash
# Install Kokoro, download its model files, regenerate this voiceover, and
# rebuild audio track v1. One command; safe to re-run (downloads are cached).
#
# Usage: ./setup_kokoro.sh
# Needs: python3, curl, ffmpeg. Cache: $KOKORO_CACHE (default ~/.cache/kokoro-onnx)
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
# Keep this path short: espeak-ng (Kokoro's phonemizer) fails to load its data
# from deep paths, so the cache defaults to ~/.cache rather than this folder.
cache="${KOKORO_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/kokoro-onnx}"
if [ "${#cache}" -gt 60 ]; then
	echo "KOKORO_CACHE path is ${#cache} chars; espeak-ng needs it under ~60. Set KOKORO_CACHE=/tmp/kokoro" >&2
	exit 1
fi
release="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
track="$here/../../../tracks/v1"

mkdir -p "$cache"
[ -x "$cache/venv/bin/python" ] || python3 -m venv "$cache/venv"
"$cache/venv/bin/pip" install -q kokoro-onnx soundfile

for file in kokoro-v1.0.onnx voices-v1.0.bin; do
	[ -s "$cache/$file" ] || curl -fL --retry 3 -o "$cache/$file" "$release/$file"
done

# 1. Voice: one clip per beat -> audio.wav, timing.json, timing.ts
"$cache/venv/bin/python" -I "$here/generate.py" "$cache/kokoro-v1.0.onnx" "$cache/voices-v1.0.bin"
ffmpeg -v error -y -i "$here/audio.wav" -c:a libmp3lame -q:a 2 "$here/audio.mp3"
rm "$here/audio.wav"

# 2. Track: loudness-normalised copy, length written into track.ts
ffmpeg -v error -y -i "$here/audio.mp3" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a libmp3lame -q:a 2 "$track/track.mp3"
length="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$track/track.mp3")"
sed -i.bak "s/length_s: [0-9.]*/length_s: $length/" "$track/track.ts" && rm "$track/track.ts.bak"

echo "Done: audio.mp3, timing.ts, track.mp3 (${length}s). Render with: npx videowright render quantumclaw_agensi_demo"
