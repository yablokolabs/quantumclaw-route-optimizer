#!/usr/bin/env python3
"""Convert a CSV of delivery stops into a QuantumClaw Q-Router problem file.

Required CSV columns: id, lat, lon, demand
Optional CSV columns: service_time_min, window_start_min, window_end_min, priority

Example:
    python3 csv_to_qrouter.py stops.csv \
        --depot "Main depot" 51.5072 -0.1276 \
        --vehicle van-1:8 --vehicle truck-1:14 \
        --out problem.json
"""

import argparse
import csv
import json
import sys

REQUIRED = ("id", "lat", "lon", "demand")


def parse_vehicle(text):
    """Parse 'id:capacity' or 'id:capacity:cost_per_km:fixed_cost:fuel_l_per_100km:co2_g_per_km'."""
    parts = text.split(":")
    if len(parts) not in (2, 6):
        raise argparse.ArgumentTypeError(
            f"vehicle '{text}' must be id:capacity or "
            "id:capacity:cost_per_km:fixed_cost:fuel_l_per_100km:co2_g_per_km"
        )
    vehicle = {"id": parts[0], "capacity": int(parts[1])}
    if len(parts) == 6:
        vehicle["cost_per_km"] = float(parts[2])
        vehicle["fixed_cost"] = float(parts[3])
        vehicle["fuel_l_per_100km"] = float(parts[4])
        vehicle["co2_g_per_km"] = float(parts[5])
    return vehicle


def read_deliveries(path):
    with open(path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        columns = {name.strip() for name in reader.fieldnames or []}
        missing = [name for name in REQUIRED if name not in columns]
        if missing:
            sys.exit(f"{path}: missing required column(s): {', '.join(missing)}")

        deliveries = []
        seen = set()
        for line, row in enumerate(reader, start=2):
            row = {key.strip(): (value or "").strip() for key, value in row.items() if key}
            if not row["id"]:
                sys.exit(f"{path}:{line}: empty id")
            if row["id"] in seen:
                sys.exit(f"{path}:{line}: duplicate id '{row['id']}'")
            seen.add(row["id"])
            try:
                delivery = {
                    "id": row["id"],
                    "location": {"lat": float(row["lat"]), "lon": float(row["lon"])},
                    "demand": int(row["demand"]),
                }
                if row.get("service_time_min"):
                    delivery["service_time_min"] = float(row["service_time_min"])
                if row.get("window_start_min") or row.get("window_end_min"):
                    delivery["window"] = {
                        "start_min": float(row.get("window_start_min") or 0),
                        "end_min": float(row["window_end_min"]),
                    }
                if row.get("priority"):
                    delivery["priority"] = float(row["priority"])
            except (KeyError, ValueError) as error:
                sys.exit(f"{path}:{line}: {error}")
            deliveries.append(delivery)
    if not deliveries:
        sys.exit(f"{path}: no delivery rows")
    return deliveries


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("csv", help="CSV file of delivery stops")
    parser.add_argument("--id", default="deliveries", help="problem id (default: deliveries)")
    parser.add_argument(
        "--depot", nargs=3, metavar=("NAME", "LAT", "LON"), required=True, help="depot name and coordinates"
    )
    parser.add_argument(
        "--vehicle",
        action="append",
        type=parse_vehicle,
        required=True,
        help="id:capacity, or id:capacity:cost_per_km:fixed_cost:fuel_l_per_100km:co2_g_per_km; repeat per vehicle",
    )
    parser.add_argument("--speed", type=float, default=32.0, help="average speed in km/h (default 32)")
    parser.add_argument("--fuel-price", type=float, default=1.5, help="fuel price per liter (default 1.5)")
    parser.add_argument("--driver-cost", type=float, default=20.0, help="driver cost per hour (default 20)")
    parser.add_argument("--out", help="output path (default: stdout)")
    args = parser.parse_args()

    depot_id = "depot-1"
    vehicles = []
    for vehicle in args.vehicle:
        vehicle["depot_id"] = depot_id
        vehicle.setdefault("average_speed_kmh", args.speed)
        vehicles.append(vehicle)

    deliveries = read_deliveries(args.csv)
    total_demand = sum(delivery["demand"] for delivery in deliveries)
    total_capacity = sum(vehicle["capacity"] for vehicle in vehicles)
    if total_demand > total_capacity:
        print(
            f"warning: total demand {total_demand} exceeds fleet capacity {total_capacity}; "
            "no plan can serve every delivery",
            file=sys.stderr,
        )

    problem = {
        "problem": {
            "id": args.id,
            "depots": [
                {
                    "id": depot_id,
                    "name": args.depot[0],
                    "location": {"lat": float(args.depot[1]), "lon": float(args.depot[2])},
                }
            ],
            "vehicles": vehicles,
            "deliveries": deliveries,
            "matrix": {"kind": "haversine", "average_speed_kmh": args.speed},
            "cost_model": {"fuel_price_per_liter": args.fuel_price, "driver_cost_per_hour": args.driver_cost},
        }
    }

    rendered = json.dumps(problem, indent=2, ensure_ascii=False) + "\n"
    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            handle.write(rendered)
        print(f"wrote {args.out}: {len(deliveries)} deliveries, {len(vehicles)} vehicles", file=sys.stderr)
    else:
        sys.stdout.write(rendered)


if __name__ == "__main__":
    main()
