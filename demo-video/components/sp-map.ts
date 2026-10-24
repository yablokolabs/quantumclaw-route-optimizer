/**
 * São Paulo delivery map drawn from the real coordinates in the skill's
 * examples/sao-paulo-deliveries.json, so the routes on screen are the routes
 * the solver produced.
 */

import { OPTS } from "./hud";

type Point = { lat: number; lon: number };

export const DEPOT: Point = { lat: -23.55, lon: -46.63 };

export const STOPS: Record<string, Point & { demand: number }> = {
	"pinheiros-1": { lat: -23.561, lon: -46.692, demand: 4 },
	"pinheiros-2": { lat: -23.567, lon: -46.701, demand: 3 },
	"pinheiros-3": { lat: -23.572, lon: -46.688, demand: 5 },
	"tatuape-1": { lat: -23.54, lon: -46.576, demand: 4 },
	"tatuape-2": { lat: -23.533, lon: -46.565, demand: 6 },
	"santana-1": { lat: -23.502, lon: -46.625, demand: 3 },
	"santana-2": { lat: -23.496, lon: -46.618, demand: 5 },
};

/** Label offset per stop, so labels in tight clusters don't collide. */
const LABELS: Record<string, { dx: number; dy: number; anchor: "start" | "end" }> = {
	"pinheiros-1": { dx: 0, dy: -24, anchor: "start" },
	"pinheiros-2": { dx: -20, dy: 8, anchor: "end" },
	"pinheiros-3": { dx: 18, dy: 34, anchor: "start" },
	"tatuape-1": { dx: 0, dy: 40, anchor: "start" },
	"tatuape-2": { dx: 20, dy: -14, anchor: "start" },
	"santana-1": { dx: -20, dy: 8, anchor: "end" },
	"santana-2": { dx: 20, dy: -14, anchor: "start" },
};

export type MapRoute = { vehicle: string; stops: string[]; color: string };

/** The customer's current plan (truck-2 carries 14 units on a 12-unit truck). */
export const BASELINE: MapRoute[] = [
	{ vehicle: "truck-1", stops: ["pinheiros-1", "tatuape-1", "santana-1"], color: "var(--cyan)" },
	{ vehicle: "truck-2", stops: ["pinheiros-2", "tatuape-2", "santana-2"], color: "var(--color-accent)" },
	{ vehicle: "van-1", stops: ["pinheiros-3"], color: "var(--color-fg)" },
];

/** dwave-sa, best feasible plan across benchmark seeds 1-5 (seed 1). */
export const OPTIMIZED: MapRoute[] = [
	{ vehicle: "truck-1", stops: ["santana-1", "pinheiros-1", "pinheiros-3"], color: "var(--cyan)" },
	{ vehicle: "truck-2", stops: ["tatuape-1", "tatuape-2"], color: "var(--color-accent)" },
	{ vehicle: "van-1", stops: ["santana-2", "pinheiros-2"], color: "var(--color-fg)" },
];

const PAD = 70;
const LON_SCALE = Math.cos((23.55 * Math.PI) / 180);

/** Equirectangular projection fitted to the stop bounding box. */
function projector(width: number, height: number) {
	const all = [DEPOT, ...Object.values(STOPS)];
	const xs = all.map((p) => p.lon * LON_SCALE);
	const ys = all.map((p) => -p.lat);
	const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
	const scale = Math.min((width - 2 * PAD) / (maxX - minX), (height - 2 * PAD) / (maxY - minY));
	const offX = (width - (maxX - minX) * scale) / 2;
	const offY = (height - (maxY - minY) * scale) / 2;
	return (p: Point) => ({
		x: offX + (p.lon * LON_SCALE - minX) * scale,
		y: offY + (-p.lat - minY) * scale,
	});
}

/** SVG markup: routes as closed depot loops, stops as labelled nodes. */
export function mapSvg(width: number, height: number, routes: MapRoute[]): string {
	const at = projector(width, height);
	const depot = at(DEPOT);

	const paths = routes
		.map((route) => {
			const points = [depot, ...route.stops.map((id) => at(STOPS[id])), depot];
			const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
			return `<path data-route="${route.vehicle}" d="${d}" fill="none" stroke="${route.color}"
        stroke-width="5" stroke-linejoin="round" stroke-linecap="round" style="opacity: 0;" />`;
		})
		.join("");

	const stops = Object.entries(STOPS)
		.map(([id, stop]) => {
			const p = at(stop);
			const label = LABELS[id];
			return `<g data-stop="${id}" style="opacity: 0;">
        <circle cx="${p.x}" cy="${p.y}" r="11" fill="var(--color-bg)" stroke="var(--color-fg)" stroke-width="3" />
        <text x="${p.x + label.dx}" y="${p.y + label.dy}" text-anchor="${label.anchor}" fill="var(--color-muted)"
          font-family="var(--font-mono)" font-size="24">${id}</text>
      </g>`;
		})
		.join("");

	return `<svg data-ref="map" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="overflow: visible;">
    ${paths}
    ${stops}
    <g data-ref="depot" style="opacity: 0;">
      <rect x="${depot.x - 16}" y="${depot.y - 16}" width="32" height="32" fill="var(--color-bg)"
        stroke="var(--color-accent)" stroke-width="3" />
      <line x1="${depot.x - 30}" y1="${depot.y}" x2="${depot.x + 30}" y2="${depot.y}" stroke="var(--color-accent)" stroke-width="2" />
      <line x1="${depot.x}" y1="${depot.y - 30}" x2="${depot.x}" y2="${depot.y + 30}" stroke="var(--color-accent)" stroke-width="2" />
      <text x="${depot.x + 26}" y="${depot.y + 40}" fill="var(--color-accent)" font-family="var(--font-mono)" font-size="22">DEPOT</text>
    </g>
  </svg>`;
}

/** Projected position of a stop, for placing callouts over the map. */
export function stopPosition(width: number, height: number, id: string): { x: number; y: number } {
	return projector(width, height)(STOPS[id]);
}

/** Nodes pop in, then each route draws itself from the depot. Returns total ms. */
export function drawMap(host: HTMLElement, startDelay = 0, perRouteMs = 700): number {
	const depot = host.querySelector('[data-ref="depot"]') as SVGGElement;
	depot.animate([{ opacity: 0 }, { opacity: 1 }], { ...OPTS, duration: 300, delay: startDelay });

	const stops = host.querySelectorAll("[data-stop]");
	stops.forEach((stop, i) => {
		(stop as SVGGElement).animate([{ opacity: 0 }, { opacity: 1 }], {
			...OPTS,
			duration: 240,
			delay: startDelay + 150 + i * 50,
		});
	});

	const routesStart = startDelay + 150 + stops.length * 50 + 150;
	const paths = host.querySelectorAll("[data-route]");
	paths.forEach((path, i) => {
		const el = path as SVGPathElement;
		const length = el.getTotalLength();
		el.style.strokeDasharray = `${length}`;
		el.style.strokeDashoffset = `${length}`;
		el.style.opacity = "1";
		el.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
			...OPTS,
			duration: perRouteMs,
			delay: routesStart + i * (perRouteMs * 0.6),
		});
	});
	return routesStart + (paths.length - 1) * perRouteMs * 0.6 + perRouteMs;
}
