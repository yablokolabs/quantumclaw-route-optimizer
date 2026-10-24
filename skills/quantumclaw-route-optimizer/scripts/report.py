#!/usr/bin/env python3
"""Turn `quantumclaw qrouter benchmark` JSON (and optionally an `optimize` plan) into a Markdown report.

Example:
    python3 report.py benchmark.json --plan plan.json > route-report.md
"""

import argparse
import json

LANE_NOTES = {
    "customer-historical": "your current plan",
    "classical-greedy": "classical greedy heuristic",
    "dwave-sa": "classical simulated annealing (D-Wave Ocean, local CPU)",
    "dwave-sqa": "quantum annealing emulator (local CPU, not a QPU)",
    "dwave-exact": "exhaustive search (small problems only)",
    "dwave-hybrid": "D-Wave Leap hybrid solver (cloud)",
    "dwave-qpu": "D-Wave quantum processor (cloud)",
}


def number(value, digits=1):
    return "—" if value is None else f"{value:,.{digits}f}"


def feasible_cell(entry):
    stats = entry.get("stats")
    if stats:
        return f"{stats['feasible_runs']}/{stats['runs']}"
    return "yes" if entry.get("feasible") else "no"


def benchmark_section(report):
    lines = [f"## Solver comparison: `{report['problem_id']}`", ""]
    lines.append(
        "| Plan | What it is | Feasible runs | Median cost | Spread (sd) | Distance km | Served | Late | CO2 kg |"
    )
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for entry in report["entries"]:
        kpis = entry["kpis"]
        stats = entry.get("stats") or {}
        label = entry["label"]
        if label == report.get("winner"):
            label = f"**{label}** (winner)"
        median = stats.get("objective_median", kpis.get("objective_value"))
        served = f"{kpis['deliveries_served']}/{kpis['deliveries_served'] + kpis['unassigned_deliveries']}"
        lines.append(
            f"| {label} | {LANE_NOTES.get(entry['backend'], entry['backend'])} | {feasible_cell(entry)} "
            f"| {number(median, 2)} | {number(stats.get('objective_stddev'), 2)} "
            f"| {number(kpis['total_distance_km'])} | {served} | {kpis['late_deliveries']} "
            f"| {number(kpis['estimated_co2_kg'])} |"
        )
    lines.append("")
    lines.append(
        "Ranking rule: plans that served every delivery on more runs rank first, then lower median cost. "
        "Distance, served, late and CO2 are from one representative run."
    )

    errors = [entry for entry in report["entries"] if entry.get("error")]
    if errors:
        lines += ["", "**Solvers that failed:**", ""]
        lines += [f"- `{entry['label']}`: {entry['error']}" for entry in errors]

    seeds = next((entry["stats"]["seeds"] for entry in report["entries"] if entry.get("stats")), None)
    if seeds:
        lines += ["", f"Seeds used: {', '.join(str(seed) for seed in seeds)} (re-running with the same seed reproduces this table)."]
    for note in report.get("notes") or []:
        lines += ["", f"> {note}"]
    return lines


def improvement_section(report):
    winner = next((entry for entry in report["entries"] if entry["label"] == report.get("winner")), None)
    baseline = next((entry for entry in report["entries"] if entry["label"] == report.get("baseline_label")), None)
    if not winner or not baseline or not winner.get("improvement"):
        return []
    gain = winner["improvement"]
    lines = ["", f"## `{winner['label']}` compared with your current plan", ""]
    lines.append("| Metric | Saved | Change |")
    lines.append("| --- | --- | --- |")
    lines.append(f"| Distance | {number(gain['distance_km_saved'])} km | {gain['distance_improvement']:.1%} |")
    lines.append(f"| Operating cost | {number(gain['cost_saved'], 2)} | {gain['cost_improvement']:.1%} |")
    lines.append(f"| CO2 | {number(gain['co2_kg_saved'])} kg | |")
    lines.append(f"| Fuel | {number(gain['fuel_liters_saved'])} l | |")
    lines.append(f"| Vehicles | {gain['vehicles_saved']} | |")
    lines.append(f"| Late deliveries avoided | {gain['late_deliveries_avoided']} | |")
    if not baseline["feasible"]:
        violations = baseline["kpis"].get("constraint_violations", 0)
        lines += ["", f"Note: your current plan breaks {violations} constraint(s), for example an overloaded vehicle."]
    return lines


def plan_section(plan):
    kpis = plan["kpis"]
    backends = sorted({sub["backend"] for sub in plan.get("subproblems", []) if sub.get("backend")})
    lines = ["", "## Recommended routes", ""]
    lines.append(
        f"Solved with {', '.join(f'`{name}`' for name in backends) or 'the classical fallback'} "
        f"using `{plan['decomposition']['strategy']}` decomposition. "
        f"Feasible: {'yes' if plan['feasible'] else 'no'}."
    )
    lines += ["", "| Vehicle | Stops in order |", "| --- | --- |"]
    for route in plan["solution"]["routes"]:
        stops = " → ".join(route["stops"]) or "(unused)"
        lines.append(f"| {route['vehicle_id']} | {route['depot_id']} → {stops} → {route['depot_id']} |")
    unassigned = plan["solution"].get("unassigned") or []
    if unassigned:
        lines += ["", f"**Unassigned:** {', '.join(unassigned)}"]
    lines += [
        "",
        f"Total {number(kpis['total_distance_km'])} km, {number(kpis['total_travel_time_min'], 0)} min driving, "
        f"cost {number(kpis['estimated_operating_cost'], 2)}, CO2 {number(kpis['estimated_co2_kg'])} kg, "
        f"{kpis['late_deliveries']} late, capacity used {kpis['capacity_utilization']:.0%}.",
    ]
    if plan.get("violations"):
        lines += ["", "**Constraint violations:**", ""]
        lines += [f"- {json.dumps(violation)}" for violation in plan["violations"]]
    seed = plan.get("problem", {}).get("metadata", {}).get("selected_seed")
    if seed:
        lines += ["", f"Best feasible plan across the benchmark seeds (seed {seed})."]
    else:
        lines += ["", "Note: this plan comes from a single unseeded run, so it can differ from the benchmark median."]
    return lines


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("benchmark", help="output of `quantumclaw qrouter benchmark`")
    parser.add_argument("--plan", help="output of `quantumclaw qrouter optimize` for the winning backend")
    args = parser.parse_args()

    with open(args.benchmark, encoding="utf-8") as handle:
        report = json.load(handle)
    lines = benchmark_section(report) + improvement_section(report)
    if args.plan:
        with open(args.plan, encoding="utf-8") as handle:
            lines += plan_section(json.load(handle))
    print("\n".join(lines))


if __name__ == "__main__":
    main()
