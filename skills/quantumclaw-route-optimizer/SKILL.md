---
name: quantumclaw-route-optimizer
description: Optimize and benchmark delivery routes (VRP with capacities and time windows) using QuantumClaw's Q-Router. Turns a list of stops, vehicles and depots into a validated routing problem, runs classical, simulated-annealing and quantum-annealing-emulator solvers side by side, and reports which plan is cheapest among the ones that actually serve every delivery, with distance, cost, CO2 and lateness. Use when the user asks to plan, optimize, compare or audit delivery routes, fleet assignments, or last-mile logistics.
license: MIT
compatibility: Requires Rust/cargo (to build the quantumclaw CLI once) and Python 3.9+ (for the optional D-Wave Ocean solvers). Runs fully offline; no API keys needed for the local solvers.
metadata:
  author: Yabloko Labs
  homepage: https://yablokolabs.com
  source: https://github.com/yablokolabs/QuantumClaw
---

# QuantumClaw Route Optimizer

This skill drives the `quantumclaw` command line from
[QuantumClaw](https://github.com/yablokolabs/QuantumClaw) to solve delivery
routing problems and to compare solvers honestly.

What it does, in plain terms:

1. Takes the user's stops, vehicles and depot(s) in whatever form they have
   (CSV, spreadsheet export, JSON, or a description).
2. Converts them into a Q-Router problem file and validates it.
3. Runs several solvers on the same problem, several times each.
4. Ranks them: **a plan that serves every delivery always beats a cheaper
   plan that doesn't**, then the lower median cost wins.
5. Writes a short report with the routes, KPIs, and what changed versus the
   user's current plan.

## Step 0: Make sure the tools are installed

Check first, install only what is missing:

```sh
command -v quantumclaw || cargo install --locked --git https://github.com/yablokolabs/QuantumClaw quantumclaw-app --bin quantumclaw
```

The first build takes about 5 minutes. Ask the user before you start it.

The D-Wave Ocean solvers (`dwave-sa`, `dwave-sqa`, `dwave-exact`) are optional
and run locally on the CPU. Install them into a virtual environment:

```sh
python3 -m venv .quantumclaw-venv
.quantumclaw-venv/bin/pip install "quantumclaw-dwave[local] @ git+https://github.com/yablokolabs/QuantumClaw#subdirectory=crates/quantumclaw-providers-dwave/python"
export QUANTUMCLAW_DWAVE_PYTHON="$PWD/.quantumclaw-venv/bin/python"
```

Install from git as shown above, not with a plain `pip install
quantumclaw-dwave`. The PyPI release is older and does not include the
`dwave-sqa` backend.

Without the Python bridge, only the `classical` lane works and the D-Wave
lanes report an `ocean_missing` error. Tell the user this and carry on with
classical rather than stopping.

Run `quantumclaw backends` to see what is available.

## Step 1: Build the problem file

The input format is in [references/input-format.md](references/input-format.md).
Read it before writing a problem file.

- **If the user has a CSV of stops**, use the converter:

  ```sh
  python3 scripts/csv_to_qrouter.py stops.csv \
      --depot "Main depot" 51.5072 -0.1276 \
      --vehicle van-1:8 --vehicle van-2:8 --vehicle truck-1:14 \
      --out problem.json
  ```

  The CSV needs `id,lat,lon,demand` columns. Optional columns are
  `service_time_min`, `window_start_min`, `window_end_min` and `priority`.
  Run `python3 scripts/csv_to_qrouter.py --help` for vehicle cost and
  emissions options.

- **If the user has addresses but no coordinates**, ask them for
  coordinates or for permission to geocode. Never invent coordinates.

- **If the user describes their current routes**, put them in
  `problem.baseline`. Every result is then compared against what they do
  today, and that comparison is usually the most useful part of the report.

- If any input is missing (vehicle capacities, demand units), ask. Do not
  guess capacities: a wrong capacity silently changes which plans count as
  feasible.

Then validate:

```sh
quantumclaw qrouter validate problem.json
```

Fix every issue it reports before going on.

## Step 2: Benchmark the solvers

```sh
quantumclaw qrouter benchmark problem.json \
    --backends classical,dwave-sa,dwave-sqa --repeat 5 --seed 1 > benchmark.json
```

- Only list backends that `quantumclaw backends` showed as installed.
- `--repeat 5` runs each stochastic solver five times. One run is a lucky or
  unlucky draw, not a measurement.
- The same `--seed` reproduces the same report exactly. Put the seed in the
  report.
- `dwave-hybrid` and `dwave-qpu` call D-Wave's cloud service. They need a
  `DWAVE_API_TOKEN` and can cost money. Only use them if the user explicitly
  asks and has a token.

## Step 3: Get the winning routes

```sh
python3 scripts/best_plan.py problem.json --backend <winner> --seeds 1-5 > plan.json
```

This re-runs the winning solver with the same seeds the benchmark used and
keeps the cheapest plan that serves every delivery. Don't use a single
unseeded `qrouter optimize` run for this step. It is one random draw and can
be noticeably worse than the benchmark median.

## Step 4: Write the report

```sh
python3 scripts/report.py benchmark.json --plan plan.json > route-report.md
```

Then read `route-report.md` and add a short summary at the top, in plain
language:

- which plan to use, and the stops in each vehicle's route
- what it saves compared with the user's current plan (distance, cost, CO2)
- anything that needs a human decision, such as late deliveries,
  unassigned stops, or a fleet near 100% capacity

## Rules for describing results

Logistics users make real decisions from this report, so be precise:

- **`dwave-sa` is classical simulated annealing.** It is not quantum.
- **`dwave-sqa` is a quantum-annealing emulator running on the CPU.** Call it
  "quantum-inspired" or "a quantum annealing emulator", never "ran on a
  quantum computer".
- Only `dwave-qpu` runs on real quantum hardware.
- The `classical` lane is a fast greedy heuristic. On fleets packed close to
  full capacity it can leave a delivery unassigned. Say so when that
  happens; it is a known limitation, not a bug in the user's data.
- Time windows are scored (late minutes count against a plan) but not
  enforced while routes are built. If a winning plan has late deliveries,
  report them clearly.
- Distances default to straight-line (haversine) estimates. Say this, and
  offer an `explicit` road-distance matrix if the user has one.
- Never present the best single run as the result. Use the median and say how
  many runs were feasible.
- If the winner was not feasible on every run, say so.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ocean_missing` | Python bridge not installed or `QUANTUMCLAW_DWAVE_PYTHON` not set (Step 0). |
| `unknown backend 'simulated_quantum_annealing'` | The bridge came from PyPI. Reinstall it from git (Step 0). |
| `is not a valid input` | JSON doesn't match the schema. Re-check against `references/input-format.md`. |
| Large instance is slow | Q-Router splits big problems automatically. Pass `--decomposition geographic-cluster` to force a split. |
