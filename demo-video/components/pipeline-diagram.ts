/**
 * The skill's pipeline as a data-flow diagram, built to diagram-design's rules
 * (github.com/cathrynlavery/diagram-design): orthogonal r=8 elbows, fanned attach
 * points, arrows drawn before boxes, accent on two elements only (the ranking
 * step and its output arrow), legend as a bottom strip, 4px grid geometry.
 * Skinned with the Motion Engineering tokens.
 */

import { OPTS } from "./hud";

export const DIAGRAM_W = 1680;
export const DIAGRAM_H = 560;

type Box = { id: string; x: number; y: number; w: number; h: number; tag: string; name: string; sub: string };

const MAIN_Y = 164;
const MAIN_H = 112;
const MID = MAIN_Y + MAIN_H / 2; // 220

const INPUT: Box = { id: "input", x: 0, y: MAIN_Y, w: 240, h: MAIN_H, tag: "INPUT", name: "Stop list", sub: "stops.csv" };
const VALIDATE: Box = { id: "validate", x: 332, y: MAIN_Y, w: 240, h: MAIN_H, tag: "STEP", name: "Validate", sub: "qrouter validate" };
const SOLVERS: Box[] = [
	{ id: "greedy", x: 716, y: 20, w: 300, h: 96, tag: "SOLVER", name: "Greedy", sub: "classical" },
	{ id: "sa", x: 716, y: 172, w: 300, h: 96, tag: "SOLVER", name: "Sim. annealing", sub: "dwave-sa" },
	{ id: "sqa", x: 716, y: 324, w: 300, h: 96, tag: "SOLVER", name: "QA emulator", sub: "dwave-sqa · CPU" },
];
const RANK: Box = { id: "rank", x: 1160, y: MAIN_Y, w: 240, h: MAIN_H, tag: "RANK", name: "Rank plans", sub: "feasible › median" };
const REPORT: Box = { id: "report", x: 1468, y: MAIN_Y, w: 212, h: MAIN_H, tag: "OUTPUT", name: "Report", sub: "route-report.md" };

const FAN_OUT_X = 644; // bend column between Validate and the solvers
const FAN_IN_X = 1088; // bend column between the solvers and Rank
const R = 8;

/** Horizontal → vertical → horizontal elbow with quarter-round r=8 corners. */
function elbow(x1: number, y1: number, bendX: number, y2: number, x2: number): string {
	if (y1 === y2) return `M${x1},${y1} H${x2}`;
	const dir = y2 > y1 ? 1 : -1;
	return [
		`M${x1},${y1}`,
		`H${bendX - R}`,
		`Q${bendX},${y1} ${bendX},${y1 + R * dir}`,
		`V${y2 - R * dir}`,
		`Q${bendX},${y2} ${bendX + R},${y2}`,
		`H${x2}`,
	].join(" ");
}

/** Attach point k of n on a box's vertical edge: L * k / (n + 1). */
function port(box: Box, k: number, n: number): number {
	return box.y + (box.h * k) / (n + 1);
}

function arrow(step: string, d: string, accent = false): string {
	return `<path data-step="${step}" d="${d}" fill="none" stroke="${accent ? "var(--color-accent)" : "var(--color-muted)"}"
    stroke-width="3" marker-end="url(#${accent ? "pd-arrow-accent" : "pd-arrow"})" style="opacity: 0;" />`;
}

function node(box: Box, step: string, focal = false): string {
	const stroke = focal ? "var(--color-accent)" : "rgba(232, 238, 245, 0.55)";
	const fill = focal ? "rgba(255, 136, 0, 0.10)" : "var(--color-surface)";
	const cx = box.x + box.w / 2;
	const tagW = box.tag.length * 11 + 20;
	const tall = box.h >= 112;
	return `<g data-step="${step}" style="opacity: 0;">
    <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="var(--color-bg)" />
    <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${focal ? 3 : 1.5}" />
    <rect x="${box.x + 12}" y="${box.y + 10}" width="${tagW}" height="22" rx="2" fill="none" stroke="${stroke}" stroke-opacity="0.6" stroke-width="1" />
    <text x="${box.x + 12 + tagW / 2}" y="${box.y + 26}" fill="${stroke}" font-size="15" font-family="Geist Mono, monospace"
      text-anchor="middle" letter-spacing="0.08em">${box.tag}</text>
    <text x="${cx}" y="${box.y + (tall ? 72 : 62)}" fill="var(--color-fg)" font-size="32" font-weight="600"
      font-family="var(--font-display)" text-anchor="middle">${box.name}</text>
    <text x="${cx}" y="${box.y + (tall ? 100 : 87)}" fill="${focal ? "var(--color-accent)" : "var(--color-muted)"}" font-size="22"
      font-family="Geist Mono, monospace" text-anchor="middle">${box.sub}</text>
  </g>`;
}

export function pipelineDiagram(): string {
	const right = (b: Box) => b.x + b.w;
	const solverMid = (b: Box) => b.y + b.h / 2;

	// Arrows first, so boxes paint over line ends.
	const arrows = [
		arrow("validate", `M${right(INPUT)},${MID} H${VALIDATE.x}`),
		...SOLVERS.map((s, i) =>
			arrow(`solver-${i}`, elbow(right(VALIDATE), port(VALIDATE, i + 1, 3), FAN_OUT_X, solverMid(s), s.x)),
		),
		...SOLVERS.map((s, i) => arrow("rank", elbow(right(s), solverMid(s), FAN_IN_X, port(RANK, i + 1, 3), RANK.x))),
		arrow("report", `M${right(RANK)},${MID} H${REPORT.x}`, true),
	].join("");

	const nodes = [
		node(INPUT, "input"),
		node(VALIDATE, "validate"),
		...SOLVERS.map((s, i) => node(s, `solver-${i}`)),
		node(RANK, "rank", true),
		node(REPORT, "report"),
	].join("");

	const legendY = 492;
	const legend = `<g data-step="legend" style="opacity: 0;">
    <line x1="0" y1="${legendY - 20}" x2="${DIAGRAM_W}" y2="${legendY - 20}" stroke="rgba(232, 238, 245, 0.10)" stroke-width="1" />
    <text x="0" y="${legendY + 20}" fill="var(--color-muted)" font-size="18" font-family="Geist Mono, monospace" letter-spacing="0.14em">LEGEND</text>
    <rect x="160" y="${legendY + 2}" width="28" height="24" rx="4" fill="rgba(255, 136, 0, 0.10)" stroke="var(--color-accent)" stroke-width="2" />
    <text x="204" y="${legendY + 20}" fill="var(--color-fg)" font-size="20" font-family="Geist Mono, monospace">FOCAL STEP</text>
    <line x1="420" y1="${legendY + 14}" x2="480" y2="${legendY + 14}" stroke="var(--color-muted)" stroke-width="3" marker-end="url(#pd-arrow)" />
    <text x="500" y="${legendY + 20}" fill="var(--color-fg)" font-size="20" font-family="Geist Mono, monospace">DATA</text>
    <line x1="620" y1="${legendY + 14}" x2="680" y2="${legendY + 14}" stroke="var(--color-accent)" stroke-width="3" marker-end="url(#pd-arrow-accent)" />
    <text x="700" y="${legendY + 20}" fill="var(--color-fg)" font-size="20" font-family="Geist Mono, monospace">WINNING PLAN</text>
  </g>`;

	return `<svg data-ref="pipeline" viewBox="0 0 ${DIAGRAM_W} ${DIAGRAM_H}" width="${DIAGRAM_W}" height="${DIAGRAM_H}"
    role="img" aria-labelledby="pd-title pd-desc" style="overflow: visible;">
    <title id="pd-title">Route optimizer pipeline</title>
    <desc id="pd-desc">A stop list is validated, solved by three solvers, ranked on feasibility then median cost, and written to a report.</desc>
    <defs>
      <marker id="pd-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="var(--color-muted)" />
      </marker>
      <marker id="pd-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="var(--color-accent)" />
      </marker>
    </defs>
    ${arrows}
    ${nodes}
    ${legend}
  </svg>`;
}

/** Reveal one pipeline step (its node plus incoming arrows). */
export function revealStep(host: HTMLElement, step: string, delay: number): void {
	host.querySelectorAll(`[data-ref="pipeline"] [data-step="${step}"]`).forEach((el) => {
		(el as SVGElement).animate(
			[
				{ opacity: 0, transform: "translateY(6px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ ...OPTS, duration: 360, delay },
		);
	});
}
