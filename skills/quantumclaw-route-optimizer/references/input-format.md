# Q-Router input format

A problem file is one JSON object with a `problem` and optional `options`.
Fields marked *(default X)* can be left out.

```json
{
  "problem": {
    "id": "monday-london",
    "depots": [
      { "id": "depot-1", "name": "Main depot", "location": { "lat": 51.5072, "lon": -0.1276 } }
    ],
    "vehicles": [
      {
        "id": "van-1",
        "depot_id": "depot-1",
        "capacity": 8,
        "cost_per_km": 0.7,
        "fixed_cost": 15.0,
        "fuel_l_per_100km": 12.0,
        "co2_g_per_km": 310.0,
        "average_speed_kmh": 40.0
      }
    ],
    "deliveries": [
      {
        "id": "stop-1",
        "location": { "lat": 51.52, "lon": -0.10 },
        "demand": 3,
        "service_time_min": 10,
        "window": { "start_min": 0, "end_min": 120 }
      }
    ],
    "matrix": { "kind": "haversine", "average_speed_kmh": 32.0 },
    "cost_model": { "fuel_price_per_liter": 1.45, "driver_cost_per_hour": 18.0 },
    "sla": { "late_penalty_per_minute": 2.0, "breach_after_minutes": 30.0 },
    "baseline": {
      "problem_id": "monday-london",
      "routes": [
        { "vehicle_id": "van-1", "depot_id": "depot-1", "stops": ["stop-1"] }
      ],
      "unassigned": []
    }
  },
  "options": { "max_variables_per_subproblem": 60 }
}
```

## `problem`

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Any string. |
| `depots[]` | yes | `id`, `location {lat, lon}`, optional `name`. |
| `vehicles[]` | yes | See below. |
| `deliveries[]` | yes | See below. |
| `matrix` | no | *(default haversine at 40 km/h)* |
| `cost_model` | no | *(default fuel 1.5/l, driver 20/h)* |
| `sla` | no | *(default 1.0 per late minute, breach after 30 min)* |
| `baseline` | no | The user's current routes. Gives "before vs after" numbers. |
| `metadata` | no | String-to-string map, passed through. |

### Vehicle

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| `id` | yes | | |
| `depot_id` | yes | | Must match a depot `id`. |
| `capacity` | yes | | Integer, same units as delivery `demand`. |
| `cost_per_km` | no | 1.0 | |
| `fixed_cost` | no | 0 | Charged once if the vehicle is used. |
| `fuel_l_per_100km` | no | 28.0 | |
| `co2_g_per_km` | no | 740.0 | |
| `average_speed_kmh` | no | 40.0 | |
| `max_distance_km` | no | none | |
| `shift` | no | none | `{start_min, end_min}` |

### Delivery

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| `id` | yes | | Unique across deliveries. |
| `location` | yes | | `{lat, lon}` |
| `demand` | yes | | Integer. |
| `service_time_min` | no | 0 | Time spent at the stop. |
| `window` | no | none | `{start_min, end_min}`, minutes from shift start. |
| `priority` | no | 1.0 | |
| `depot_id` | no | none | Pins the stop to one depot. |

### Distance matrix

Straight-line estimate (default):

```json
{ "kind": "haversine", "average_speed_kmh": 32.0 }
```

Real road distances, when the user has them:

```json
{
  "kind": "explicit",
  "nodes": ["depot-1", "stop-1", "stop-2"],
  "distances_km": [[0, 4.2, 6.1], [4.2, 0, 3.0], [6.1, 3.0, 0]],
  "durations_min": [[0, 11, 15], [11, 0, 8], [15, 8, 0]]
}
```

`nodes` must list every depot and delivery id. `durations_min` is optional.

## `options`

| Field | Default | Notes |
| --- | --- | --- |
| `backend` | none | Same as `--backend`. Leave it unset for benchmarks. |
| `decomposition` | auto | `single-block`, `depot-partition`, `geographic-cluster`, `capacity-cluster`, `time-window-partition`, `rolling-horizon`. |
| `max_variables_per_subproblem` | 60 | Bigger problems are split until each piece fits. |
| `sampler_seed` | none | Makes a single `optimize` run reproducible. |

## Units

- Distances in km, times in minutes, money in whatever currency the user
  uses (keep it consistent across `cost_per_km`, `fixed_cost` and
  `cost_model`).
- `demand` and `capacity` must use the same unit: parcels, pallets, kg, and
  so on.
