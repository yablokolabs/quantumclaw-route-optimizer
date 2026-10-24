# Audio plan

VO-only track: one cue, full file, placed at 0s.

## Cues

### vo
- Source: audio/originals/voiceovers/v1/audio.mp3
- Slice: full file
- Place at: 0s
- Volume: 1.0
- Notes: Kokoro bf_emma (British female), one clip per beat; timing.json holds per-beat spans.

## Final mix

```bash
ffmpeg -y -i audio/originals/voiceovers/v1/audio.mp3 -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a libmp3lame -q:a 2 {TRACK_OUT}
```

## Log

## 2026-10-24 19:28 -- Built v1
**Source:** voiceovers/v1 (Kokoro bf_emma)
**Length:** 66.768000s

## 2026-10-24 19:28 -- Synced timing to v1
**Segments:** qc-title, qc-prompt, qc-problem, qc-benchmark, qc-routes, qc-savings, qc-cta
**Method:** per-beat clip boundaries from generate.py (no STT needed)
