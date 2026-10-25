# Benchmark: QuantumClaw vs Google OR-Tools

QuantumClaw's Q-Router lanes against Google OR-Tools on public routing
instances with published best-known solutions (BKS). Wins and losses are both
reported.

Full tables: [results/RESULTS.md](results/RESULTS.md). Raw runs, routes
included: [results/runs/](results/runs/).

## Findings (run of 25 Oct 2026)

OR-Tools won all 13 instances. No QuantumClaw lane beat it at any time budget,
including OR-Tools' 1-second run.

| | OR-Tools 60 s | Best QuantumClaw lane (median of 5) |
| --- | --- | --- |
| Feasible plans | 13/13 | 5/13 (CVRP only) |
| Gap to BKS, Solomon VRPTW | +0.0% to +6.0% | infeasible on all 8: 60–88 of 100 customers late |
| Gap to BKS, CVRP X | +1.9% to +6.4% | +48% to +142% |
| Time per run | 60 s | 0.02 s (`classical`), 43 s (`dwave-sa`), 665 s (`dwave-sqa`) |

What the numbers say:

- **Time windows are the first gap.** Q-Router builds routes without the time
  windows and only scores lateness afterwards. Its routes are identical across
  R101–R103, RC101–RC103 and C101–C102, which share locations and differ only
  in time windows.
- **On capacity-only routing, distance is the second gap.** Every lane served
  every customer within capacity, but the median plan was 48–167% above BKS.
  Even the best of 5 runs was 42–149% longer than OR-Tools at 60 s.
- **The gap is in the pipeline, not the sampler.** `classical` (no QUBO),
  `dwave-sa` (classical annealing) and `dwave-sqa` (quantum emulator) land in
  the same range. Splitting the problem into ≤60-variable QUBO pieces and
  stitching them back together costs more distance than the choice of sampler
  can recover. Real quantum hardware would receive the same pieces.
- **Quantum emulator vs classical annealing on the same QUBOs:** `dwave-sqa`
  had the lower median on 3 of 5 CVRP instances, at about 15x the runtime.

What would change these results: enforcing time windows during construction,
classical local search (2-opt, relocate, swap) after the QUBO stage, and
decomposition that clusters by location and time. Then re-run this benchmark.

## Instances

From [PyVRP/Instances](https://github.com/PyVRP/Instances) (MIT, see
`instances/LICENSE-PyVRP-Instances`), which mirrors CVRPLIB.

| Set | Instances | Customers | Constraints | Distance convention |
| --- | --- | --- | --- | --- |
| Solomon VRPTW | R101, R102, R103, RC101, RC102, RC103, C101, C102 | 100 | capacity, time windows | Euclidean, truncated to 1 decimal |
| Uchoa CVRP (X) | X-n101-k25, X-n106-k14, X-n110-k13, X-n115-k10, X-n120-k6 | 100–119 | capacity | Euclidean, rounded to integer |

R101–RC103 are the six instances used in arXiv:2503.24285, which compared a
D-Wave hybrid method with OR-Tools.

## Lanes

| Lane | What runs | Runs per instance |
| --- | --- | --- |
| `classical` | Q-Router's greedy cheapest-insertion path | 5 seeds |
| `dwave-sa` | Q-Router QUBO pipeline, classical simulated annealing | 5 seeds |
| `dwave-sqa` | Q-Router QUBO pipeline, quantum-annealing emulator on CPU | 5 seeds |
| `ortools-1s`, `-10s`, `-60s` | OR-Tools, parallel cheapest insertion + guided local search | 1 per time budget |

No lane uses quantum hardware.

## How plans are scored

`run_benchmark.py` scores every plan with one checker and ignores
solver-reported KPIs. A plan is feasible only if:

- every customer is served exactly once
- no route exceeds vehicle capacity
- for VRPTW, no customer is served after its due time and every vehicle is
  back before the depot closes (travel time equals distance)
- it uses no more vehicles than the instance allows

Fleet sizes: the Solomon limit (25) for VRPTW, and the instance's minimum
fleet plus 3 for CVRP. Both solvers get the same fleet.

QuantumClaw cells are the median of 5 seeded runs, ranked feasible-first. A
QuantumClaw lane wins an instance only when its median plan is feasible and
shorter than OR-Tools'.

## Known limits of this comparison

- Q-Router scores time windows but does not enforce them while building
  routes, so expect late deliveries on the VRPTW set. The CVRP set has no time
  windows and is the fairer test of the routing itself.
- OR-Tools runs once per budget. Its guided local search is deterministic for
  a given budget on one machine, but wall-clock limits can shift results
  slightly between machines.
- Runtimes were measured with 4 runs in parallel on a 4-core cloud VM.

## Reproduce

```sh
# QuantumClaw CLI
cargo install --locked --git https://github.com/yablokolabs/QuantumClaw quantumclaw-app --bin quantumclaw

# Python: OR-Tools and the D-Wave Ocean bridge
python3 -m venv .venv
.venv/bin/pip install ortools "quantumclaw-dwave[local] @ git+https://github.com/yablokolabs/QuantumClaw#subdirectory=crates/quantumclaw-providers-dwave/python"
export QUANTUMCLAW_DWAVE_PYTHON="$PWD/.venv/bin/python"

# Run (resumable: finished runs are saved in results/jobs and skipped)
.venv/bin/python run_benchmark.py --seeds 1-5 --ortools-seconds 1,10,60 --jobs 4
.venv/bin/python make_report.py
```
