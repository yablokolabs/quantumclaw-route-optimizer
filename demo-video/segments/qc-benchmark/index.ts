import { defineSegment } from "videowright";
import { enterHud, hudScene, OPTS, rise } from "../../components/hud";

let host: HTMLElement | null = null;

type Row = { id: string; plan: string; what: string; feasible: number | null; median: string };

// Real output of `quantumclaw qrouter benchmark` on the bundled São Paulo instance, seeds 1-5.
const ROWS: Row[] = [
	{ id: "baseline", plan: "current plan", what: "overloads truck-2", feasible: null, median: "267.28" },
	{ id: "classical", plan: "classical", what: "greedy heuristic", feasible: 0, median: "234.49" },
	{ id: "dwave-sa", plan: "dwave-sa", what: "simulated annealing (classical)", feasible: 5, median: "239.95" },
	{ id: "dwave-sqa", plan: "dwave-sqa", what: "quantum annealing emulator (CPU)", feasible: 4, median: "229.42" },
];

function pips(feasible: number | null): string {
	if (feasible === null) {
		return `<span style="font-family: var(--font-mono); font-size: 34px; color: var(--warn);">&#10007; infeasible</span>`;
	}
	const boxes = Array.from(
		{ length: 5 },
		(_, i) => `<span data-pip style="display: inline-block; width: 30px; height: 30px; margin-right: 8px;
        border: 2px solid var(--cyan); background: ${i < feasible ? "var(--cyan)" : "transparent"}; opacity: 0;"></span>`,
	).join("");
	return `${boxes}<span style="font-family: var(--font-mono); font-size: 34px; margin-left: 10px;">${feasible}/5</span>`;
}

export default defineSegment({
	id: "qc-benchmark",
	advances: [3.22, 7.85, 12.91],
	voiceover:
		"The skill runs each solver with five fixed seeds. The greedy solver leaves one stop unserved on every run, so it drops out. Simulated annealing serves all seven stops on all five runs, so it wins.",
	notes: "Benchmark table. Beat 1: classical strands a stop on every run. Beat 2: dwave-sa wins on feasibility first.",

	mount(el) {
		host = el;
		const rows = ROWS.map(
			(row) => `
        <div data-row="${row.id}" style="
          position: relative; display: grid; grid-template-columns: 330px 1fr 420px 220px;
          align-items: center; padding: 26px 24px; border-top: 1px solid var(--color-border); opacity: 0;
        ">
          <span style="font-family: var(--font-mono); font-size: 40px;">${row.plan}</span>
          <span style="font-size: 36px; color: var(--color-muted);">${row.what}</span>
          <span>${pips(row.feasible)}</span>
          <span style="font-family: var(--font-mono); font-size: 44px; text-align: right; font-variant-numeric: tabular-nums;">${row.median}</span>
          <div data-strike style="position: absolute; left: 24px; right: 24px; top: 50%; height: 2px; background: var(--warn);
            transform-origin: 0 50%; transform: scaleX(0);"></div>
          <div data-box style="position: absolute; inset: -2px; border: 3px solid var(--color-accent); opacity: 0;"></div>
        </div>`,
		).join("");

		el.innerHTML = hudScene(
			"SOLVER BENCHMARK &middot; 5 SEEDED RUNS EACH",
			`
      <div style="
        position: absolute; left: 56px; right: 56px; top: 110px;
        display: grid; grid-template-columns: 330px 1fr 420px 220px; padding: 0 24px 14px;
        font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.15em; color: var(--color-muted);
      "><span>PLAN</span><span>WHAT IT IS</span><span>SERVED EVERY STOP</span><span style="text-align: right;">MEDIAN COST</span></div>
      <div style="position: absolute; left: 56px; right: 56px; top: 160px;">${rows}</div>
      <div data-ref="note-classical" style="
        position: absolute; left: 56px; right: 56px; top: 770px; opacity: 0;
        font-size: 44px; color: var(--warn);
      "><span style="font-family: var(--font-mono);">classical</span> &middot; 1 stop unserved on 5/5 runs &middot; out</div>
      <div data-ref="note-winner" style="
        position: absolute; left: 56px; right: 56px; top: 770px; opacity: 0;
        font-size: 44px;
      "><span style="color: var(--color-accent); font-family: var(--font-mono);">WINNER dwave-sa</span>
        &middot; 7/7 stops served on 5/5 runs</div>
    `,
			"<span>RULE: FEASIBLE RUNS &gt; MEDIAN OBJECTIVE</span><span style=\"margin-left: auto;\">SEEDS 1&ndash;5 &middot; REPRODUCIBLE</span>",
		);
	},

	async play(ctx) {
		if (!host) return;
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		const row = (id: string) => host?.querySelector(`[data-row="${id}"]`) as HTMLElement;
		enterHud(host);
		ROWS.forEach((r, i) => {
			const el = row(r.id);
			rise(el, 300 + i * 260, 360, 10);
			el.querySelectorAll("[data-pip]").forEach((pip, j) => {
				(pip as HTMLElement).animate([{ opacity: 0 }, { opacity: 1 }], {
					...OPTS,
					duration: 120,
					delay: 500 + i * 260 + j * 70,
				});
			});
		});

		await ctx.waitForNext();

		(row("classical").querySelector("[data-strike]") as HTMLElement).animate(
			[{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
			{ ...OPTS, duration: 500 },
		);
		row("classical").animate([{ opacity: 1 }, { opacity: 0.45 }], { ...OPTS, duration: 400, delay: 400 });
		rise(q("note-classical"), 200, 360, 10);

		await ctx.waitForNext();

		q("note-classical").animate([{ opacity: 1 }, { opacity: 0 }], { ...OPTS, duration: 200 });
		rise(q("note-winner"), 200, 360, 10);
		const box = row("dwave-sa").querySelector("[data-box]") as HTMLElement;
		box.animate(
			[
				{ opacity: 0, transform: "scale(1.04)" },
				{ opacity: 1, transform: "scale(1)" },
			],
			{ ...OPTS, duration: 400 },
		);
	},

	unmount() {
		host = null;
	},
});
