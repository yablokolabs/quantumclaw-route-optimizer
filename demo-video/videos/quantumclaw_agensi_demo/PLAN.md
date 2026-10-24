# Plan: QuantumClaw Route Optimizer — Agensi demo

## Purpose
- Audience: people browsing the Agensi marketplace for agent skills (developers, ops/logistics teams).
- Takeaway: install the skill, give your agent a stop list, and get a benchmarked, feasible route plan with honest solver labels.
- Constraints / hard guidelines: every number on screen is real output from the bundled São Paulo example (benchmark seeds 1–5, best plan seed 1). Never call `dwave-sa` or `dwave-sqa` quantum hardware.

## Style
- Active style: motion-engineering
- Notes: fonts are self-hosted in `styles/motion-engineering/fonts/` so renders don't depend on Google Fonts.

## Audio intent
- Voiceover: yes. Kokoro `bf_emma`, British female (local TTS; ElevenLabs and Hugging Face were blocked by the build network)
- Sound effects: no
- Background music: no
- Notes: one clip per beat; `generate.py` writes exact beat timing, no STT pass.

## Segment outline
1. qc-title — skill name, what it compares, which agents run it
2. qc-prompt — buyer's prompt, then the pipeline as a diagram-design data-flow diagram
3. qc-problem — current São Paulo routes on a map; truck-2 overloaded (14/12)
4. qc-benchmark — 4 plans × feasibility pips × median cost; classical struck out; dwave-sa wins
5. qc-routes — recommended routes draw in; 7/7 served, 0 late, within capacity
6. qc-savings — −21% km, −15% cost, −33% CO2 vs current routes, with caveat line
7. qc-cta — Free on Agensi, GitHub and website

---

## Log

### 2026-10-24 — Initial scaffold
- Created segments: qc-title, qc-prompt, qc-problem, qc-benchmark, qc-routes, qc-savings, qc-cta
- Shared components: components/hud.ts (scene chrome), components/sp-map.ts (projected São Paulo map)
- Timeline: 7 segments, style: motion-engineering
- Voiceover: none

### 2026-10-24 — Voiceover, diagram, copy pass
- Added VO v1 (Kokoro bf_emma) and audio track v1; timeline uses it as default_audio_track
- qc-prompt: replaced the command list with a pipeline diagram (diagram-design rules: r=8 elbows, fanned ports, 2 accent elements, bottom legend, Geist Mono)
- Copy pass with stop-slop and i-have-adhd: active voice, no em dashes, no slogan fragments, point-wise captions
- Self-hosted fonts in styles/motion-engineering/fonts
