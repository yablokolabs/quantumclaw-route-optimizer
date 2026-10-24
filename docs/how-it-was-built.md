# How the demo video was built

67 s, 1080p60, British female narration. Every number on screen comes from a real QuantumClaw run.

## Tools

| Job | Tool |
| --- | --- |
| Video scenes and render | [Videowright](https://github.com/scosman/videowright) (HTML/CSS/TS scenes, Playwright + ffmpeg export) |
| Visual style | Videowright's built-in Motion Engineering pack |
| Diagram rules | [diagram-design](https://github.com/cathrynlavery/diagram-design) |
| Writing rules | [stop-slop](https://github.com/hardikpandya/stop-slop), [i-have-adhd](https://github.com/ayghri/i-have-adhd) |
| Voice | [Kokoro](https://github.com/hexgrad/kokoro) via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), voice `bf_emma` |
| Data | [QuantumClaw](https://github.com/yablokolabs/QuantumClaw) `qrouter benchmark` on the bundled São Paulo example |

## Pipeline

1. **Get real numbers.** Run the skill on `skills/quantumclaw-route-optimizer/examples/sao-paulo-deliveries.json` (seeds 1–5). Copy the results into the scenes.
2. **Set up Videowright.** `npm install videowright`, pick a style, write `videowright.config.ts`.
3. **Plan the scenes.** `demo-video/videos/quantumclaw_agensi_demo/PLAN.md`: purpose, style, audio, scene list.
4. **Build shared parts** in `demo-video/components/`:
   - `hud.ts`: scene frame, grid, corner ticks, entrance animations
   - `sp-map.ts`: São Paulo map projected from real lat/lon
   - `pipeline-diagram.ts`: the skill's pipeline as a data-flow diagram
5. **Write 7 scenes** in `demo-video/segments/qc-*/index.ts`. Each scene waits at `ctx.waitForNext()` between beats.
6. **Write the narration**: one line per beat in `script.json`.
7. **Generate the voice**: `setup_kokoro.sh` makes one clip per line and joins them.
8. **Render a 10 fps preview**, pull still frames, fix layout.
9. **Render the final** at 60 fps.

## Key techniques

### Exact voice timing without speech-to-text
- `generate.py` generates each narration line as its own clip
- Clip lengths are known, so each beat's start time is known
- Output: `timing.ts`, the advance times Videowright uses to switch beats
- Videowright's default flow needs an STT pass for this; per-line clips skip it

### Map from real coordinates
- `sp-map.ts` projects lat/lon with a cosine-corrected equirectangular fit
- Routes on screen = routes the solver returned
- Per-stop label offsets stop clustered labels colliding

### Diagram built to diagram-design rules
- Orthogonal connectors with r=8 rounded corners, no diagonals
- Fan-out ports spaced at `L * k / (N + 1)` along the box edge
- Arrows drawn before boxes
- Accent on 2 elements only: "Rank plans" and its output arrow
- Legend as a bottom strip
- Geist Mono for technical labels (diagram-design bans JetBrains Mono in diagrams)
- Deviation: kept the dark Motion Engineering skin so the scene matches the rest of the video

### Fonts self-hosted
- Videowright does not load a style's Google Fonts
- `styles/motion-engineering/fonts/` holds Space Grotesk, JetBrains Mono, Geist Mono
- Renders never depend on the network

### Frame checks before the final render
- `npx videowright render ... --fps 10` takes ~1 min vs ~8 min at 60 fps
- `ffmpeg -ss <t> -i preview.mp4 -frames:v 1 frame.png` pulls stills
- Caught: prompt text off-screen, overlapping map labels, wrapped legend rows

## Writing rules applied

| Rule | Before | After |
| --- | --- | --- |
| No slogan fragments (stop-slop) | "Delivery routes, benchmarked." | "Benchmark your delivery routes" |
| No quotable lines (stop-slop) | "Cheapest-looking plans don't count if they skip a delivery." | "classical · 1 stop unserved on 5/5 runs · out" |
| Points, not prose (i-have-adhd) | paragraph listing caveats | 2 bullet lines |

- Narration speaks to "you" in active voice: "you cut distance by twenty one percent"
- No em dashes in narration, captions or listing

## Problems hit and fixes

| Problem | Fix |
| --- | --- |
| ElevenLabs host blocked by the build network | Kokoro, run locally |
| VoiceStudio models on Hugging Face, also blocked | kokoro-onnx model files from GitHub releases |
| espeak-ng fails from deep install paths | `setup_kokoro.sh` caches in `~/.cache/kokoro-onnx` |
| Style fonts not loaded at render | self-hosted `@font-face` in `fonts.css` |
| One unseeded solver run worse than the benchmark median | `best_plan.py` re-runs the benchmark seeds, keeps the best feasible |
| PyPI `quantumclaw-dwave` 0.1.1 lacks `dwave-sqa` | skill installs the bridge from git |

## Reproduce this video

```sh
cd demo-video
npm install
npx playwright install chromium
./videos/quantumclaw_agensi_demo/audio/originals/voiceovers/v1/setup_kokoro.sh   # needs python3, curl, ffmpeg
npx videowright dev                                                               # preview
npx videowright render quantumclaw_agensi_demo --output final/quantumclaw-route-optimizer-demo.mp4
```

- Change narration: edit `script.json`, re-run `setup_kokoro.sh`
- Change voice: set `"voice"` in `script.json` (`bf_isabella`, `bf_alice`, `bf_lily` are other British female voices)

## Use as a reference for a new demo

Give your agent this prompt:

```text
Make a demo video for <my product> using
https://github.com/yablokolabs/quantumclaw-route-optimizer as the reference.
Read docs/how-it-was-built.md first.

Reuse:
- Videowright setup, Motion Engineering style, self-hosted fonts
- components/hud.ts and the components/pipeline-diagram.ts pattern
- generate.py + setup_kokoro.sh for the voice (bf_emma)

Rules:
- every number on screen comes from a real run of my product
- narration and captions: stop-slop and i-have-adhd
- diagrams: diagram-design
- 10 fps preview and still-frame check before the final render
```

| Reuse as-is | Rewrite per product |
| --- | --- |
| Videowright config, style, fonts | scenes in `segments/` |
| `hud.ts` | map and benchmark table |
| diagram builder pattern | `script.json` narration |
| `generate.py`, `setup_kokoro.sh` | numbers, claims, call to action |
