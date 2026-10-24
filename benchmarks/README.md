# Benchmark: QuantumClaw vs Google OR-Tools

QuantumClaw's Q-Router lanes against Google OR-Tools on public routing
instances with published best-known solutions (BKS). Wins and losses are both
reported.

Results: [results/RESULTS.md](results/RESULTS.md).

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
