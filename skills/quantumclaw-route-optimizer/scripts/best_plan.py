#!/usr/bin/env python3
"""Run `quantumclaw qrouter optimize` with several fixed seeds and keep the cheapest feasible plan.

One optimize run of a stochastic solver is a single draw. This script runs the
same seeds the benchmark used, so the plan it returns is one the benchmark saw.

Example:
    python3 best_plan.py problem.json --backend dwave-sa --seeds 1-5 > plan.json
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile


def parse_seeds(text):
    if "-" in text:
        first, last = (int(part) for part in text.split("-", 1))
        return list(range(first, last + 1))
    return [int(part) for part in text.split(",")]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("problem", help="Q-Router problem file")
    parser.add_argument("--backend", required=True, help="backend name, e.g. dwave-sa or classical")
    parser.add_argument("--seeds", default="1-5", help="seed range '1-5' or list '1,3,7' (default 1-5)")
    parser.add_argument("--quantumclaw", default="quantumclaw", help="path to the quantumclaw binary")
    args = parser.parse_args()

    with open(args.problem, encoding="utf-8") as handle:
        request = json.load(handle)

    best = None
    for seed in parse_seeds(args.seeds):
        request.setdefault("options", {})["sampler_seed"] = seed
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
            json.dump(request, handle)
            path = handle.name
        try:
            result = subprocess.run(
                [args.quantumclaw, "qrouter", "optimize", path, "--backend", args.backend, "--compact"],
                capture_output=True,
                text=True,
            )
        finally:
            os.unlink(path)
        if result.returncode != 0:
            sys.exit(result.stderr.strip() or f"quantumclaw exited with {result.returncode}")

        plan = json.loads(result.stdout)
        cost = plan["kpis"]["objective_value"]
        print(f"seed {seed}: feasible={plan['feasible']} cost={cost}", file=sys.stderr)
        rank = (not plan["feasible"], cost if cost is not None else float("inf"))
        if best is None or rank < best[0]:
            best = (rank, seed, plan)

    _, seed, plan = best
    plan.setdefault("problem", {}).setdefault("metadata", {})["selected_seed"] = str(seed)
    print(f"kept seed {seed}", file=sys.stderr)
    json.dump(plan, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
