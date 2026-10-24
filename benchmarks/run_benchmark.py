#!/usr/bin/env python3
"""Benchmark QuantumClaw's Q-Router lanes against Google OR-Tools on public instances.

Every plan, from every solver, is scored by the same independent checker in
this file. Solver-reported KPIs are ignored. The checker counts distance with
the instance's own rounding convention, so totals are directly comparable to
the best-known solutions (BKS) shipped next to each instance.

Instances (all public, from https://github.com/PyVRP/Instances, MIT):

- Solomon VRPTW, 100 customers: R101-R103, RC101-RC103 (the six instances used
  in arXiv:2503.24285), plus C101 and C102. Distances truncated to one decimal
  (DIMACS convention). Travel time equals distance.
- Uchoa CVRP "X" set, 100-119 customers: X-n101-k25 ... X-n120-k6. Distances
  rounded to the nearest integer (CVRPLIB convention).

Lanes:

- ``classical``, ``dwave-sa``, ``dwave-sqa``: ``quantumclaw qrouter optimize``,
  one run per seed.
- ``ortools``: OR-Tools routing with
  capacity and time windows as hard constraints. PARALLEL_CHEAPEST_INSERTION
  + GUIDED_LOCAL_SEARCH, run once per time budget.

A plan is feasible only if every customer is served exactly once, no route
exceeds capacity and, for VRPTW, no customer is served after its due time and
every vehicle is back at the depot before it closes.

Usage:

    python3 run_benchmark.py --quantumclaw path/to/quantumclaw \\
        --backends classical,dwave-sa,dwave-sqa --seeds 1-5 \\
        --ortools-seconds 1,10 --out results
"""

from __future__ import annotations

import argparse
import json
import math
import os
import statistics
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_INSTANCES = [
    "R101", "R102", "R103", "RC101", "RC102", "RC103", "C101", "C102",
    "X-n101-k25", "X-n106-k14", "X-n110-k13", "X-n115-k10", "X-n120-k6",
]


# ---------------------------------------------------------------------------
# Instances
# ---------------------------------------------------------------------------


@dataclass
class Instance:
    name: str
    kind: str  # "VRPTW" or "CVRP"
    capacity: int
    vehicles: int
    coords: list[tuple[float, float]]
    demands: list[int]
    service: list[float]
    windows: list[tuple[float, float]] | None
    bks: float
    dist: list[list[float]] = field(default_factory=list)

    @property
    def customers(self) -> range:
        return range(1, len(self.coords))


def parse_vrplib(path: Path) -> dict:
    header: dict[str, str] = {}
    sections: dict[str, list[list[str]]] = {}
    current = None
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line == "EOF":
            continue
        if line.endswith("SECTION"):
            current = line
            sections[current] = []
        elif ":" in line and current is None:
            key, value = line.split(":", 1)
            header[key.strip()] = value.strip()
        elif current is not None:
            sections[current].append(line.split())
    return {"header": header, "sections": sections}


def read_bks(path: Path) -> float:
    for line in path.read_text().splitlines():
        if line.lower().startswith("cost"):
            return float(line.split()[1])
    raise ValueError(f"no cost line in {path}")


def load_instance(name: str) -> Instance:
    data = parse_vrplib(HERE / "instances" / f"{name}.vrp")
    header, sections = data["header"], data["sections"]
    coords = [(float(r[1]), float(r[2])) for r in sections["NODE_COORD_SECTION"]]
    demands = [int(r[1]) for r in sections["DEMAND_SECTION"]]
    capacity = int(header["CAPACITY"])
    if "TIME_WINDOW_SECTION" in sections:
        kind = "VRPTW"
        windows = [(float(r[1]), float(r[2])) for r in sections["TIME_WINDOW_SECTION"]]
        service_time = float(header.get("SERVICE_TIME", 0))
        service = [0.0] + [service_time] * (len(coords) - 1)
        vehicles = int(header["VEHICLES"])
    else:
        kind = "CVRP"
        windows = None
        service = [0.0] * len(coords)
        # The "k" in X-nNNN-kK is the minimum fleet; BKS sometimes uses one more.
        min_fleet = int(name.split("-k")[1])
        vehicles = min_fleet + 3
    inst = Instance(
        name=name,
        kind=kind,
        capacity=capacity,
        vehicles=vehicles,
        coords=coords,
        demands=demands,
        service=service,
        windows=windows,
        bks=read_bks(HERE / "instances" / f"{name}.sol"),
    )
    inst.dist = distance_matrix(inst)
    return inst


def distance_matrix(inst: Instance) -> list[list[float]]:
    n = len(inst.coords)
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        xi, yi = inst.coords[i]
        for j in range(n):
            xj, yj = inst.coords[j]
            d = math.hypot(xi - xj, yi - yj)
            if inst.kind == "VRPTW":
                d = math.floor(d * 10) / 10  # DIMACS: truncate to one decimal
            else:
                d = float(round(d))  # CVRPLIB: nearest integer
            matrix[i][j] = d
    return matrix


def node_id(index: int) -> str:
    return "depot" if index == 0 else f"c{index}"


# ---------------------------------------------------------------------------
# Independent checker
# ---------------------------------------------------------------------------


def evaluate(inst: Instance, routes: list[list[int]]) -> dict:
    """Scores a plan given as lists of customer indices (depot excluded)."""
    seen: dict[int, int] = {}
    distance = 0.0
    over_capacity = 0
    late_customers = 0
    late_minutes = 0.0
    depot_late = 0
    for route in routes:
        if not route:
            continue
        load = sum(inst.demands[c] for c in route)
        if load > inst.capacity:
            over_capacity += 1
        prev = 0
        clock = inst.windows[0][0] if inst.windows else 0.0
        for c in route:
            seen[c] = seen.get(c, 0) + 1
            distance += inst.dist[prev][c]
            if inst.windows:
                clock += inst.dist[prev][c]
                ready, due = inst.windows[c]
                clock = max(clock, ready)
                if clock > due + 1e-6:
                    late_customers += 1
                    late_minutes += clock - due
                clock += inst.service[c]
            prev = c
        distance += inst.dist[prev][0]
        if inst.windows:
            clock += inst.dist[prev][0]
            if clock > inst.windows[0][1] + 1e-6:
                depot_late += 1
    missing = [c for c in inst.customers if c not in seen]
    duplicated = [c for c, k in seen.items() if k > 1]
    used = sum(1 for r in routes if r)
    feasible = (
        not missing
        and not duplicated
        and over_capacity == 0
        and late_customers == 0
        and depot_late == 0
        and used <= inst.vehicles
    )
    distance = round(distance, 1)
    return {
        "distance": distance,
        "gap_pct": round(100.0 * (distance - inst.bks) / inst.bks, 2),
        "routes": used,
        "feasible": feasible,
        "missing": len(missing),
        "duplicated": len(duplicated),
        "over_capacity_routes": over_capacity,
        "late_customers": late_customers,
        "late_minutes": round(late_minutes, 1),
        "late_depot_returns": depot_late,
    }


# ---------------------------------------------------------------------------
# QuantumClaw lanes
# ---------------------------------------------------------------------------


def qrouter_request(inst: Instance) -> dict:
    n = len(inst.coords)
    nodes = [node_id(i) for i in range(n)]
    matrix: dict = {
        "kind": "explicit",
        "nodes": nodes,
        "distances_km": inst.dist,
    }
    if inst.windows:
        matrix["durations_min"] = inst.dist  # Solomon: travel time = distance
    vehicles = []
    for v in range(inst.vehicles):
        vehicle = {
            "id": f"v{v + 1}",
            "depot_id": "depot",
            "capacity": inst.capacity,
            "cost_per_km": 1.0,
            "fixed_cost": 0.0,
            "average_speed_kmh": 60.0,
        }
        if inst.windows:
            vehicle["shift"] = {"start_min": inst.windows[0][0], "end_min": inst.windows[0][1]}
        vehicles.append(vehicle)
    deliveries = []
    for c in inst.customers:
        delivery = {
            "id": node_id(c),
            "location": {"lat": inst.coords[c][1] / 1000.0, "lon": inst.coords[c][0] / 1000.0},
            "demand": inst.demands[c],
            "service_time_min": inst.service[c],
        }
        if inst.windows:
            delivery["window"] = {"start_min": inst.windows[c][0], "end_min": inst.windows[c][1]}
        deliveries.append(delivery)
    return {
        "problem": {
            "id": inst.name,
            "depots": [
                {
                    "id": "depot",
                    "location": {"lat": inst.coords[0][1] / 1000.0, "lon": inst.coords[0][0] / 1000.0},
                }
            ],
            "vehicles": vehicles,
            "deliveries": deliveries,
            "matrix": matrix,
            # Fuel and driver cost off: the solver's objective is distance plus late penalties.
            "cost_model": {"fuel_price_per_liter": 0.0, "driver_cost_per_hour": 0.0},
        },
        "options": {},
    }


def routes_from_plan(plan: dict) -> list[list[int]]:
    solution = plan.get("solution") or plan.get("plan") or plan
    routes = []
    for route in solution.get("routes", []):
        stops = route.get("stops", [])
        ids = [s if isinstance(s, str) else s.get("delivery_id") or s.get("id") for s in stops]
        routes.append([int(i[1:]) for i in ids if i and i.startswith("c")])
    return routes


def run_quantumclaw(binary: str, request: dict, backend: str, seed: int, timeout: int) -> tuple[list[list[int]] | None, float, str | None]:
    request = json.loads(json.dumps(request))
    request["options"]["sampler_seed"] = seed
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
        json.dump(request, handle)
        path = handle.name
    try:
        start = time.perf_counter()
        result = subprocess.run(
            [binary, "qrouter", "optimize", path, "--backend", backend, "--compact"],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        elapsed = time.perf_counter() - start
    except subprocess.TimeoutExpired:
        return None, float(timeout), f"timeout after {timeout}s"
    finally:
        os.unlink(path)
    if result.returncode != 0:
        return None, elapsed, (result.stderr.strip() or f"exit {result.returncode}")[-500:]
    return routes_from_plan(json.loads(result.stdout)), elapsed, None


# ---------------------------------------------------------------------------
# OR-Tools lane
# ---------------------------------------------------------------------------


def run_ortools(inst: Instance, seconds: float) -> tuple[list[list[int]] | None, float]:
    from ortools.constraint_solver import pywrapcp, routing_enums_pb2

    scale = 10  # integer arcs; keeps one decimal exactly
    n = len(inst.coords)
    cost = [[int(round(inst.dist[i][j] * scale)) for j in range(n)] for i in range(n)]
    manager = pywrapcp.RoutingIndexManager(n, inst.vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    def arc(i: int, j: int) -> int:
        return cost[manager.IndexToNode(i)][manager.IndexToNode(j)]

    arc_cb = routing.RegisterTransitCallback(arc)
    routing.SetArcCostEvaluatorOfAllVehicles(arc_cb)

    demand_cb = routing.RegisterUnaryTransitCallback(lambda i: inst.demands[manager.IndexToNode(i)])
    routing.AddDimensionWithVehicleCapacity(demand_cb, 0, [inst.capacity] * inst.vehicles, True, "load")

    if inst.windows:
        def travel(i: int, j: int) -> int:
            a, b = manager.IndexToNode(i), manager.IndexToNode(j)
            return int(round(inst.service[a] * scale)) + cost[a][b]

        time_cb = routing.RegisterTransitCallback(travel)
        horizon = int(inst.windows[0][1] * scale)
        routing.AddDimension(time_cb, horizon, horizon, False, "time")
        time_dim = routing.GetDimensionOrDie("time")
        for c in inst.customers:
            ready, due = inst.windows[c]
            time_dim.CumulVar(manager.NodeToIndex(c)).SetRange(int(ready * scale), int(due * scale))
        for v in range(inst.vehicles):
            time_dim.CumulVar(routing.Start(v)).SetRange(int(inst.windows[0][0] * scale), horizon)
            time_dim.CumulVar(routing.End(v)).SetRange(int(inst.windows[0][0] * scale), horizon)

    params = pywrapcp.DefaultRoutingSearchParameters()
    # Cheapest insertion builds a feasible start on tight time windows, where
    # PATH_CHEAPEST_ARC often finds none.
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.FromMilliseconds(int(seconds * 1000))

    start = time.perf_counter()
    solution = routing.SolveWithParameters(params)
    elapsed = time.perf_counter() - start
    if solution is None:
        return None, elapsed
    routes = []
    for v in range(inst.vehicles):
        index = routing.Start(v)
        route = []
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node != 0:
                route.append(node)
            index = solution.Value(routing.NextVar(index))
        routes.append(route)
    return routes, elapsed


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------


def parse_seeds(text: str) -> list[int]:
    if "-" in text:
        first, last = (int(p) for p in text.split("-", 1))
        return list(range(first, last + 1))
    return [int(p) for p in text.split(",")]


def summarise(runs: list[dict]) -> dict:
    ok = [r for r in runs if r.get("eval")]
    feasible = [r for r in ok if r["eval"]["feasible"]]
    distances = [r["eval"]["distance"] for r in ok]
    return {
        "runs": len(runs),
        "feasible_runs": len(feasible),
        "median_distance": round(statistics.median(distances), 1) if distances else None,
        "best_feasible_distance": min((r["eval"]["distance"] for r in feasible), default=None),
        "median_runtime_s": round(statistics.median(r["runtime_s"] for r in runs), 2) if runs else None,
        "median_late_customers": statistics.median(r["eval"]["late_customers"] for r in ok) if ok else None,
        "median_missing": statistics.median(r["eval"]["missing"] for r in ok) if ok else None,
        "errors": [r["error"] for r in runs if r.get("error")][:3],
    }


def job_path(out: Path, name: str, lane: str, seed: int | None) -> Path:
    return out / "jobs" / f"{name}__{lane}__{seed if seed is not None else 'once'}.json"


def run_job(job: dict) -> str:
    """One solver run on one instance. Saved to its own file, so a restart resumes."""
    inst = load_instance(job["instance"])
    if job["lane"].startswith("ortools-"):
        routes, elapsed = run_ortools(inst, job["seconds"])
        error = None if routes else "no solution"
    else:
        routes, elapsed, error = run_quantumclaw(
            job["quantumclaw"], qrouter_request(inst), job["lane"], job["seed"], job["timeout"])
    run = {"seed": job["seed"], "runtime_s": round(elapsed, 2), "error": error}
    if routes is not None:
        run["eval"] = evaluate(inst, routes)
        run["routes"] = routes
    path = Path(job["path"])
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(run))
    tmp.replace(path)
    status = run.get("eval", {}).get("distance", error)
    return f"{job['instance']} {job['lane']} seed={job['seed']} -> {status} ({elapsed:.1f}s)"


def assemble(out: Path, names: list[str], lanes: list[tuple[str, list[int | None]]]) -> int:
    """Collects finished job files into one runs/<instance>.json per instance."""
    written = 0
    for name in names:
        inst = load_instance(name)
        record = {"instance": name, "kind": inst.kind, "customers": len(inst.coords) - 1,
                  "vehicles": inst.vehicles, "bks": inst.bks, "lanes": {}}
        for lane, seeds in lanes:
            runs = [json.loads(p.read_text()) for s in seeds if (p := job_path(out, name, lane, s)).exists()]
            if runs:
                record["lanes"][lane] = {"summary": summarise(runs), "runs": runs}
        if record["lanes"]:
            (out / "runs" / f"{name}.json").write_text(json.dumps(record, indent=1))
            written += 1
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--quantumclaw", default="quantumclaw")
    parser.add_argument("--backends", default="classical,dwave-sa,dwave-sqa")
    parser.add_argument("--seeds", default="1-5")
    parser.add_argument("--ortools-seconds", default="1,10")
    parser.add_argument("--instances", default=",".join(DEFAULT_INSTANCES))
    parser.add_argument("--timeout", type=int, default=1800, help="per QuantumClaw run, seconds")
    parser.add_argument("--jobs", type=int, default=os.cpu_count() or 1, help="runs in parallel")
    parser.add_argument("--assemble-only", action="store_true", help="skip solving, rebuild runs/*.json")
    parser.add_argument("--out", default=str(HERE / "results"))
    # make_report.py turns results/runs/*.json into RESULTS.md and summary.json.
    args = parser.parse_args()

    out = Path(args.out)
    (out / "runs").mkdir(parents=True, exist_ok=True)
    (out / "jobs").mkdir(parents=True, exist_ok=True)
    names = args.instances.split(",")
    seeds = parse_seeds(args.seeds)
    budgets = [float(s) for s in args.ortools_seconds.split(",") if s]
    lanes: list[tuple[str, list[int | None]]] = [(b, seeds) for b in args.backends.split(",") if b]
    lanes += [(f"ortools-{s:g}s", [None]) for s in budgets]

    jobs = []
    for lane, lane_seeds in lanes:
        for name in names:
            for seed in lane_seeds:
                path = job_path(out, name, lane, seed)
                if path.exists():
                    continue
                jobs.append({"instance": name, "lane": lane, "seed": seed, "path": str(path),
                             "seconds": float(lane.split("-")[1].rstrip("s")) if lane.startswith("ortools-") else None,
                             "quantumclaw": args.quantumclaw, "timeout": args.timeout})
    # Slowest lane first, so the pool doesn't end on one long straggler.
    jobs.sort(key=lambda j: 0 if j["lane"] == "dwave-sqa" else 1)

    if not args.assemble_only and jobs:
        from concurrent.futures import ProcessPoolExecutor, as_completed

        print(f"{len(jobs)} run(s) to do, {args.jobs} at a time", file=sys.stderr)
        with ProcessPoolExecutor(max_workers=args.jobs) as pool:
            for done, future in enumerate(as_completed(pool.submit(run_job, j) for j in jobs), 1):
                print(f"[{done}/{len(jobs)}] {future.result()}", file=sys.stderr, flush=True)

    written = assemble(out, names, lanes)
    print(f"wrote {written} instance file(s) to {out / 'runs'}", file=sys.stderr)


if __name__ == "__main__":
    main()
