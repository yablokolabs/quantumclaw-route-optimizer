import { defineSegment } from "videowright";
import { enterHud, hudScene, OPTS, rise } from "../../components/hud";
import { BASELINE, drawMap, mapSvg, stopPosition } from "../../components/sp-map";

let host: HTMLElement | null = null;

const MAP_W = 980;
const MAP_H = 760;
const MAP_LEFT = 140;
const MAP_TOP = 110;

function readout(label: string, value: string, unit: string): string {
	return `
    <div data-readout style="opacity: 0; padding: 18px 0; border-top: 1px solid var(--color-border);">
      <div style="font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.15em; color: var(--color-muted);">${label}</div>
      <div style="font-family: var(--font-mono); font-size: 64px; font-variant-numeric: tabular-nums;">${value}
        <span style="font-size: 28px; color: var(--color-muted);">${unit}</span></div>
    </div>`;
}

export default defineSegment({
	id: "qc-problem",
	advances: [3.84, 7.64],
	voiceover:
		"This São Paulo morning has seven stops and three vehicles. Your current plan puts fourteen units on a twelve unit truck.",
	notes: "The customer's current routes, then the overloaded truck called out on a leader line.",

	mount(el) {
		host = el;
		const callout = stopPosition(MAP_W, MAP_H, "santana-2");
		el.innerHTML = hudScene(
			"TODAY'S PLAN &middot; SÃO PAULO &middot; 7 STOPS &middot; 3 VEHICLES",
			`
      <div style="position: absolute; left: ${MAP_LEFT}px; top: ${MAP_TOP}px;">${mapSvg(MAP_W, MAP_H, BASELINE)}</div>
      <svg data-ref="leader" style="position: absolute; left: 0; top: 0; overflow: visible;" width="1" height="1">
        <polyline points="${MAP_LEFT + callout.x + 12},${MAP_TOP + callout.y - 12} ${MAP_LEFT + callout.x + 120},${MAP_TOP + callout.y - 120} 1140,${MAP_TOP + callout.y - 120}"
          fill="none" stroke="var(--warn)" stroke-width="2" style="opacity: 0;" />
      </svg>
      <div data-ref="flag" style="
        position: absolute; left: 1150px; top: ${MAP_TOP + callout.y - 170}px; right: 56px;
        border: 2px solid var(--warn); padding: 14px 22px; opacity: 0;
        font-family: var(--font-mono); color: var(--warn);
      ">
        <div style="font-size: 26px; letter-spacing: 0.15em;">TRUCK-2 &middot; OVERLOADED</div>
        <div style="font-size: 52px; font-variant-numeric: tabular-nums;">14 / 12 units</div>
      </div>
      <div data-ref="readouts" style="position: absolute; left: 1150px; right: 56px; top: 470px;">
        ${readout("DISTANCE", "78.0", "km")}
        ${readout("OPERATING COST", "267.28", "")}
        ${readout("CO2", "48.9", "kg")}
      </div>
    `,
			"<span>BASELINE &middot; customer-historical</span><span style=\"margin-left: auto;\">FEASIBLE: NO</span>",
		);
	},

	async play(ctx) {
		if (!host) return;
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		enterHud(host);
		drawMap(host, 300, 650);
		host.querySelectorAll("[data-readout]").forEach((row, i) => rise(row, 900 + i * 150));

		await ctx.waitForNext();

		(q("leader").querySelector("polyline") as SVGPolylineElement).animate([{ opacity: 0 }, { opacity: 1 }], {
			...OPTS,
			duration: 250,
		});
		rise(q("flag"), 200, 360, 10);
		host.querySelector('[data-route="truck-2"]')?.animate(
			[{ strokeWidth: 5 }, { strokeWidth: 10 }, { strokeWidth: 7 }],
			{ ...OPTS, duration: 600, delay: 200 },
		);
	},

	unmount() {
		host = null;
	},
});
