import { defineSegment } from "videowright";
import { enterHud, hudScene, OPTS, rise, tickNumber } from "../../components/hud";

let host: HTMLElement | null = null;

// Best feasible plan (seed 1) vs the customer's current routes.
const STATS: { label: string; pct: number; from: string; to: string }[] = [
	{ label: "DISTANCE", pct: 21, from: "78.0 km", to: "61.6 km" },
	{ label: "OPERATING COST", pct: 15, from: "267.28", to: "226.39" },
	{ label: "CO2", pct: 33, from: "48.9 kg", to: "32.9 kg" },
];

export default defineSegment({
	id: "qc-savings",
	advances: [6.8, 11.93],
	voiceover:
		"Compared with your current routes, you cut distance by twenty one percent, cost by fifteen, and C O two by a third. These numbers come from the bundled example. Your own data will give different ones.",
	notes: "Three stat columns tick to their savings, then the caveat line about what was compared.",

	mount(el) {
		host = el;
		const columns = STATS.map(
			(s) => `
        <div data-stat style="position: relative; opacity: 0;">
          <svg style="position: absolute; left: 0; top: -30px; overflow: visible;" width="520" height="20">
            <line x1="0" y1="10" x2="520" y2="10" stroke="var(--cyan)" stroke-width="2" style="transform-origin: 0 10px; transform: scaleX(0);" />
          </svg>
          <div style="font-family: var(--font-mono); font-size: 28px; letter-spacing: 0.15em; color: var(--color-muted);">${s.label}</div>
          <div data-num data-pct="${s.pct}" style="font-family: var(--font-mono); font-size: 190px; line-height: 1.05;
            color: var(--color-accent); font-variant-numeric: tabular-nums;">&minus;0%</div>
          <div style="font-family: var(--font-mono); font-size: 40px; color: var(--color-fg);">${s.from} &rarr; ${s.to}</div>
        </div>`,
		).join("");

		el.innerHTML = hudScene(
			"RESULT &middot; VS. CURRENT ROUTES",
			`
      <div style="position: absolute; left: 56px; right: 56px; top: 250px;
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 56px;">${columns}</div>
      <div data-ref="caveat" style="position: absolute; left: 56px; right: 56px; top: 700px; opacity: 0;
        font-size: 38px; color: var(--color-muted); line-height: 1.35;">
        &bull; Same 3 vehicles &middot; 7/7 stops served &middot; overload fixed<br/>
        &bull; Bundled São Paulo example &middot; straight-line km &middot; your numbers will differ
      </div>
    `,
			"<span>PLAN: dwave-sa &middot; SEED 1</span><span style=\"margin-left: auto;\">BASELINE: customer-historical</span>",
		);
	},

	async play(ctx) {
		if (!host) return;
		enterHud(host);
		host.querySelectorAll("[data-stat]").forEach((stat, i) => {
			const delay = 300 + i * 350;
			rise(stat, delay, 360, 12);
			(stat.querySelector("line") as SVGLineElement).animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
				...OPTS,
				duration: 500,
				delay,
			});
			const num = stat.querySelector("[data-num]") as HTMLElement;
			setTimeout(
				() => tickNumber(num, Number(num.dataset.pct), { prefix: "−", suffix: "%", steps: 12, stepMs: 50 }),
				delay + 100,
			);
		});

		await ctx.waitForNext();

		rise(host.querySelector('[data-ref="caveat"]') as HTMLElement, 0, 420, 10);
	},

	unmount() {
		host = null;
	},
});
