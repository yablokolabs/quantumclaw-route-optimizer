import { defineSegment } from "videowright";
import { enterHud, hudScene, rise } from "../../components/hud";
import { drawMap, mapSvg, OPTIMIZED } from "../../components/sp-map";

let host: HTMLElement | null = null;

const MAP_W = 980;
const MAP_H = 760;

// Loads from the skill's examples/sao-paulo-deliveries.json demands.
const LEGEND: [string, string, string, string][] = [
	["truck-1", "var(--cyan)", "3 stops", "12 / 12"],
	["truck-2", "var(--color-accent)", "2 stops", "10 / 12"],
	["van-1", "var(--color-fg)", "2 stops", "8 / 8"],
];

export default defineSegment({
	id: "qc-routes",
	advances: [2.19, 7.2],
	voiceover:
		"These are the winning routes. All seven stops arrive on time, and each vehicle stays within capacity.",
	notes: "The recommended dwave-sa routes draw in, then the plan's headline readout.",

	mount(el) {
		host = el;
		const legend = LEGEND.map(
			([vehicle, color, stops, load]) => `
        <div data-legend style="display: flex; align-items: center; gap: 24px; padding: 20px 0;
          border-top: 1px solid var(--color-border); opacity: 0;">
          <span style="width: 56px; height: 6px; background: ${color};"></span>
          <span style="font-family: var(--font-mono); font-size: 38px; width: 170px; white-space: nowrap;">${vehicle}</span>
          <span style="font-size: 34px; color: var(--color-muted); flex: 1; white-space: nowrap;">${stops}</span>
          <span style="font-family: var(--font-mono); font-size: 38px; font-variant-numeric: tabular-nums; white-space: nowrap;">${load}</span>
        </div>`,
		).join("");

		el.innerHTML = hudScene(
			"RECOMMENDED ROUTES &middot; dwave-sa &middot; SEED 1",
			`
      <div style="position: absolute; left: 140px; top: 110px;">${mapSvg(MAP_W, MAP_H, OPTIMIZED)}</div>
      <div style="position: absolute; left: 1150px; right: 56px; top: 150px;">
        <div style="font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.15em; color: var(--color-muted); padding-bottom: 12px;">
          VEHICLE &middot; STOPS &middot; LOAD</div>
        ${legend}
      </div>
      <div data-ref="summary" style="position: absolute; left: 1150px; right: 56px; top: 560px; opacity: 0;">
        <div style="font-family: var(--font-mono); font-size: 72px; color: var(--cyan);">7/7 served</div>
        <div style="font-size: 36px; margin-top: 12px;">0 late &middot; all vehicles within capacity</div>
        <div style="font-family: var(--font-mono); font-size: 40px; margin-top: 12px; color: var(--color-muted);">61.6 km &middot; cost 226.39</div>
      </div>
    `,
			"<span>DECOMPOSITION: single-block</span><span>24 VARIABLES</span><span style=\"margin-left: auto;\">FEASIBLE: YES</span>",
		);
	},

	async play(ctx) {
		if (!host) return;
		enterHud(host);
		drawMap(host, 300, 650);
		host.querySelectorAll("[data-legend]").forEach((row, i) => rise(row, 900 + i * 400, 360, 10));

		await ctx.waitForNext();

		rise(host.querySelector('[data-ref="summary"]') as HTMLElement, 0, 420, 14);
	},

	unmount() {
		host = null;
	},
});
