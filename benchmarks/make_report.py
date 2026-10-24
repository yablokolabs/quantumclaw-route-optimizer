#!/usr/bin/env python3
"""Turns results/runs/*.json into results/summary.json and results/RESULTS.md.

Win and loss counts compare each QuantumClaw lane's median run against
OR-Tools. A lane only wins an instance when its plan is feasible and shorter.
An infeasible plan loses, whatever its distance.

Usage:
    python3 make_report.py [--results results]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
QC_LANES = ["classical", "dwave-sa", "dwave-sqa"]


def median_run(lane: dict) -> dict | None:
    """The run whose distance is the median, ranked feasible-first like the CLI."""
    runs = [r for r in lane["runs"] if r.get("eval")]
    if not runs:
        return None
    runs.sort(key=lambda r: (not r["eval"]["feasible"], r["eval"]["distance"]))
    return runs[(len(runs) - 1) // 2]


def cell(run: dict | None, feasible_runs: int | None = None, total: int | None = None) -> str:
    if run is None:
        return "error"
    e = run["eval"]
    text = f"{e['gap_pct']:+.1f}%"
    if not e["feasible"]:
        problems = []
        if e["late_customers"]:
            problems.append(f"{e['late_customers']} late")
        if e["missing"]:
            problems.append(f"{e['missing']} unserved")
        if e["over_capacity_routes"]:
            problems.append(f"{e['over_capacity_routes']} over cap")
        if e["late_depot_returns"] and not e["late_customers"]:
            problems.append("late return")
        text += " ✗ " + ", ".join(problems or ["infeasible"])
    if total and total > 1:
        text += f" ({feasible_runs}/{total} feasible)"
    return text


def beats(qc: dict | None, ref: dict | None) -> bool:
    if qc is None or not qc["eval"]["feasible"]:
        return False
    if ref is None or not ref["eval"]["feasible"]:
        return True
    return qc["eval"]["distance"] < ref["eval"]["distance"] - 1e-9


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--results", default=str(HERE / "results"))
    args = parser.parse_args()
    results = Path(args.results)

    records = [json.loads(p.read_text()) for p in sorted((results / "runs").glob("*.json"))]
    order = {name: i for i, name in enumerate(
        ["R101", "R102", "R103", "RC101", "RC102", "RC103", "C101", "C102",
         "X-n101-k25", "X-n106-k14", "X-n110-k13", "X-n115-k10", "X-n120-k6"])}
    records.sort(key=lambda r: order.get(r["instance"], 99))

    ortools_lanes = sorted({k for r in records for k in r["lanes"] if k.startswith("ortools-")},
                           key=lambda k: float(k.split("-")[1].rstrip("s")))
    qc_lanes = [l for l in QC_LANES if any(l in r["lanes"] for r in records)]
    reference = ortools_lanes[-1] if ortools_lanes else None
    fastest = ortools_lanes[0] if ortools_lanes else None

    summary = []
    tally = {l: {"wins_vs_ref": 0, "wins_vs_fastest": 0, "feasible_instances": 0, "instances": 0} for l in qc_lanes}
    rows = []
    for r in records:
        medians = {}
        line = [r["instance"], r["kind"], f"{r['bks']:g}"]
        for lane in ortools_lanes:
            medians[lane] = median_run(r["lanes"][lane])
            line.append(cell(medians[lane]))
        for lane in qc_lanes:
            data = r["lanes"].get(lane)
            if data is None:
                line.append("—")
                continue
            medians[lane] = median_run(data)
            s = data["summary"]
            line.append(cell(medians[lane], s["feasible_runs"], s["runs"]))
            t = tally[lane]
            t["instances"] += 1
            t["feasible_instances"] += int(bool(medians[lane] and medians[lane]["eval"]["feasible"]))
            t["wins_vs_ref"] += int(beats(medians[lane], medians.get(reference)))
            t["wins_vs_fastest"] += int(beats(medians[lane], medians.get(fastest)))
        rows.append(line)
        summary.append({
            "instance": r["instance"], "kind": r["kind"], "customers": r["customers"],
            "vehicles": r["vehicles"], "bks": r["bks"],
            "lanes": {k: v["summary"] for k, v in r["lanes"].items()},
            "median_eval": {k: (v["eval"] if v else None) for k, v in medians.items()},
        })

    runtimes = {}
    for lane in ortools_lanes + qc_lanes:
        values = [r["lanes"][lane]["summary"]["median_runtime_s"] for r in records if lane in r["lanes"]]
        runtimes[lane] = sorted(values)[len(values) // 2] if values else None

    (results / "summary.json").write_text(json.dumps(summary, indent=1))

    headers = ["Instance", "Type", "BKS"] + [l.replace("ortools-", "OR-Tools ") for l in ortools_lanes] + qc_lanes
    md = []
    md.append("| " + " | ".join(headers) + " |")
    md.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for line in rows:
        md.append("| " + " | ".join(line) + " |")
    table = "\n".join(md)

    score = ["| QuantumClaw lane | Feasible (median run) | Beats OR-Tools " + (fastest or "") .replace("ortools-", "")
             + " | Beats OR-Tools " + (reference or "").replace("ortools-", "") + " | Median runtime per run |",
             "| --- | --- | --- | --- | --- |"]
    n = len(records)
    for lane in qc_lanes:
        t = tally[lane]
        score.append(f"| {lane} | {t['feasible_instances']}/{t['instances']} | {t['wins_vs_fastest']}/{t['instances']} "
                     f"| {t['wins_vs_ref']}/{t['instances']} | {runtimes[lane]} s |")
    for lane in ortools_lanes:
        score.append(f"| {lane.replace('ortools-', 'OR-Tools ')} (reference) | "
                     f"{sum(1 for s in summary if s['median_eval'].get(lane) and s['median_eval'][lane]['feasible'])}/{n} | — | — | {runtimes[lane]} s |")

    (results / "RESULTS.md").write_text(
        "# Results\n\n"
        "Generated by `make_report.py` from `runs/*.json`. Cells show the gap to the best-known solution (BKS); "
        "lower is better. QuantumClaw cells are the median of 5 seeded runs. ✗ marks an infeasible plan and says why.\n\n"
        "## Scoreboard\n\n" + "\n".join(score) + "\n\n## Per instance\n\n" + table + "\n"
    )
    print((results / "RESULTS.md").read_text())


if __name__ == "__main__":
    main()
