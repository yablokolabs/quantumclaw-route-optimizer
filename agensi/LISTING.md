# Agensi listing: QuantumClaw Route Optimizer

Paste-ready values for https://www.agensi.io/dashboard/submit.

- Step 1: upload `../dist/quantumclaw-route-optimizer.zip`
- Step 2 logo: `logo.png`
- Screenshots: `screenshot-report.png`
- Demo video: `../demo-video/final/quantumclaw-route-optimizer-demo.mp4` (upload to YouTube or Loom, paste the link)
- Demo numbers: real output, bundled São Paulo example, seeds 1–5

---

## Step 2: Skill details

**Skill name** (36/60)

```
QuantumClaw Delivery Route Optimizer
```

**Summary**

```
Benchmark 3 route solvers on your stops. Get the cheapest plan that serves every delivery.
```

**Full description**

```markdown
Built on [QuantumClaw](https://github.com/yablokolabs/QuantumClaw) (MIT, Yabloko Labs).

### What you get
- Validated routing problem from your CSV or JSON: capacities, time windows, cost per km, fuel, CO2
- 3 solvers, 5 seeded runs each: greedy, simulated annealing, quantum annealing emulator
- Ranking: plans that serve every stop first, then lowest median cost
- Savings vs your current routes: km, cost, fuel, CO2
- Flags on your current plan: overloaded vehicles, missed stops
- Markdown report with each vehicle's stop order

### Solver labels
- `classical`: greedy heuristic
- `dwave-sa`: simulated annealing, classical, runs on your CPU
- `dwave-sqa`: quantum annealing emulator, runs on your CPU
- `dwave-hybrid`, `dwave-qpu`: real D-Wave cloud, opt-in, needs a Leap token

### Runs
- Offline for the local solvers
- No API keys
- Large fleets split by depot, area, capacity or time window

### For
- Courier and last-mile teams auditing current routes
- Ops and data teams needing a reproducible routing benchmark
- Developers testing quantum-inspired optimisation on real data

### Included
- `SKILL.md`: workflow and reporting rules
- `scripts/csv_to_qrouter.py`: CSV to problem file
- `scripts/best_plan.py`: best feasible plan across seeds
- `scripts/report.py`: benchmark JSON to Markdown report
- `references/input-format.md`: input schema, road-distance matrices
- Examples: São Paulo, London

### Limits
- Straight-line distances unless you supply a road matrix
- Time windows scored, not enforced during route building
- No pickup-delivery pairs, driver breaks or multi-day plans yet
```

---

## Step 3: Demo

**The request (what the buyer types)**

```markdown
São Paulo depot. 2 trucks (cap 12), 1 van (cap 8). Today's 7 stops and our current routes: `examples/sao-paulo-deliveries.json`.

Find a better plan. Compare the solvers. Show what we save.
```

**The result (what your agent delivers)**

```markdown
## Summary
- Current plan: **infeasible**. truck-2 carries 14 units on a 12-unit truck.
- Use: **`dwave-sa`** plan. Only solver to serve all 7 stops on 5/5 runs.
- Best plan: **61.6 km**, cost **226.39**, CO2 **32.9 kg** (current: 78.0 km, 267.28, 48.9 kg)

## Solver comparison: `sao-paulo-morning`

| Plan | What it is | Feasible runs | Median cost | Spread (sd) | Distance km | Served | Late | CO2 kg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | current plan | no | 267.28 | n/a | 78.0 | 7/7 | 0 | 48.9 |
| classical | greedy heuristic | 0/5 | 234.49 | 0.00 | 63.6 | 6/7 | 0 | 38.7 |
| **dwave-sa** (winner) | simulated annealing, classical, CPU | 5/5 | 239.95 | 13.36 | 68.5 | 7/7 | 0 | 37.3 |
| dwave-sqa | quantum annealing emulator, CPU | 4/5 | 229.42 | 11.84 | 60.1 | 7/7 | 0 | 35.7 |

- Rank rule: feasible runs first, then median cost
- Seeds 1–5; same seeds reproduce this table

**Reading it**
- `classical`: 1 stop unserved on every run (fleet at 94% capacity)
- `dwave-sqa`: lowest median, missed a stop on 1 of 5 runs
- `dwave-sa`: every stop, every run

## Savings vs current plan (benchmark median)

| Metric | Saved | Change |
| --- | --- | --- |
| Distance | 9.4 km | 12.1% |
| Operating cost | 27.33 | 10.2% |
| CO2 | 11.6 kg | |
| Fuel | 4.3 l | |

## Recommended routes
`dwave-sa`, best feasible plan across seeds 1–5 (seed 1)

| Vehicle | Stops in order | Load |
| --- | --- | --- |
| truck-1 | depot-sp → santana-1 → pinheiros-1 → pinheiros-3 → depot-sp | 12/12 |
| truck-2 | depot-sp → tatuape-1 → tatuape-2 → depot-sp | 10/12 |
| van-1 | depot-sp → santana-2 → pinheiros-2 → depot-sp | 8/8 |

- 61.6 km, 115 min driving
- 0 late
- 94% capacity used

**Next steps**
1. Send a road-distance matrix to re-run on real roads
2. Add a van on heavy days: fleet runs at 94% capacity (30 of 32 units)
3. Re-run weekly on real stop lists
```

---

## Step 4: Compatibility note

```
Rust/cargo (one-time ~5 min build). Python 3.9+ for D-Wave Ocean solvers. Offline. No API keys for local solvers. Tested on Linux.
```

---

## Step 5: Pricing

**Free** (reasons in chat)

---

## Tags, categories, use cases

- **Tags:** route-optimization, logistics, vrp, delivery, fleet, quantum, qubo, d-wave, optimization, benchmarking, rust
- **Category:** Data & Analytics (or Operations / Logistics if listed)
- **Use cases:** last-mile planning, fleet route audits, solver benchmarking, quantum-inspired optimisation

---

## Permissions

**Required tools & software** (one per line)

```
Rust toolchain (cargo)
Python 3.9+
quantumclaw CLI (installed by the skill from github.com/yablokolabs/QuantumClaw)
quantumclaw-dwave Python bridge (optional, for D-Wave solvers)
```

**Tools used:** tick **Terminal / Shell**, **Read Files**, **Write Files**, **Network Access**, **Environment Variables**. Leave **Browser** unticked.

**Needs access to:** leave empty. Optional "Other tool": `dwave.com` (cloud solvers only).

**File scopes**

```
*.csv
*.json
route-report.md
.quantumclaw-venv/**
```

**Notes**

```
- Shell: runs the quantumclaw CLI and bundled Python scripts
- Network: one-time install only (cargo from GitHub, pip); routing runs offline
- QUANTUMCLAW_DWAVE_PYTHON: path to the solver bridge
- DWAVE_API_TOKEN: read only if you opt into D-Wave cloud solvers
- Local solvers keep delivery data on your machine
```

---

## FAQ

**Does this run on a quantum computer?**
- Default: no. CPU only.
- Opt-in: D-Wave Leap hybrid or QPU with your own token.

**Do I need an API key?**
- No. Local solvers need none.

**How big a problem?**
- Small and medium: one piece.
- Large: auto-split by depot, area, capacity or time window.

**Real road distances?**
- Default: straight-line at an average speed.
- Supply a distance/duration matrix for real roads.

**Why did the cheaper solver lose?**
- It skipped a delivery or broke a capacity limit.

**Open source?**
- Yes. MIT, github.com/yablokolabs/QuantumClaw.

---

## Extra details

- **Documentation URL:** `https://github.com/yablokolabs/QuantumClaw/blob/main/docs/brains/qrouter.md`
- **Website:** `https://yablokolabs.com`
- **Source:** `https://github.com/yablokolabs/QuantumClaw`
- **Demo video:** `demo-video/final/quantumclaw-route-optimizer-demo.mp4`, 67 s, 1080p60, British female narration
