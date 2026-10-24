import { defineSegment } from "videowright";
import { enterHud, hudScene, OPTS, rise } from "../../components/hud";

let host: HTMLElement | null = null;

export default defineSegment({
	id: "qc-cta",
	advances: [3.58, 7.88],
	voiceover:
		"QuantumClaw Route Optimizer is free on Agensi. Get the code on GitHub, at yabloko labs slash QuantumClaw.",
	notes: "Reticle locks onto the call to action; links follow as coordinates.",

	mount(el) {
		host = el;
		el.innerHTML = hudScene(
			"INSTALL &middot; AGENSI",
			`
      <svg data-ref="reticle" style="position: absolute; left: 50%; top: 330px; transform: translate(-50%, -50%); overflow: visible;"
        width="220" height="220" viewBox="-110 -110 220 220">
        <circle r="90" fill="none" stroke="var(--color-accent)" stroke-width="2" style="transform: scale(0);" />
        <line x1="-110" y1="0" x2="-40" y2="0" stroke="var(--color-accent)" stroke-width="2" style="opacity: 0;" />
        <line x1="40" y1="0" x2="110" y2="0" stroke="var(--color-accent)" stroke-width="2" style="opacity: 0;" />
        <line x1="0" y1="-110" x2="0" y2="-40" stroke="var(--color-accent)" stroke-width="2" style="opacity: 0;" />
        <line x1="0" y1="40" x2="0" y2="110" stroke="var(--color-accent)" stroke-width="2" style="opacity: 0;" />
      </svg>
      <div data-ref="headline" style="position: absolute; left: 56px; right: 56px; top: 470px; text-align: center; opacity: 0;
        font-family: var(--font-display); font-weight: 500; font-size: 110px; letter-spacing: -0.02em;">
        QuantumClaw Route Optimizer</div>
      <div data-ref="free" style="position: absolute; left: 56px; right: 56px; top: 610px; text-align: center; opacity: 0;
        font-family: var(--font-mono); font-size: 52px; color: var(--color-accent);">Free on Agensi</div>
      <div data-ref="links" style="position: absolute; left: 56px; right: 56px; top: 720px; text-align: center; opacity: 0;
        font-family: var(--font-mono); font-size: 40px; color: var(--cyan); line-height: 1.6;">
        github.com/yablokolabs/QuantumClaw<br/>yablokolabs.com</div>
    `,
			"<span>LICENSE MIT</span><span>RUNS OFFLINE</span><span style=\"margin-left: auto;\">YABLOKO LABS</span>",
		);
	},

	async play(ctx) {
		if (!host) return;
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		enterHud(host);
		const reticle = q("reticle");
		(reticle.querySelector("circle") as SVGCircleElement).animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
			...OPTS,
			duration: 420,
			delay: 200,
		});
		reticle.querySelectorAll("line").forEach((line, i) => {
			line.animate([{ opacity: 0 }, { opacity: 1 }], { ...OPTS, duration: 200, delay: 450 + i * 50 });
		});
		rise(q("headline"), 600, 460, 16);

		await ctx.waitForNext();

		rise(q("free"), 0, 360, 10);
		rise(q("links"), 300, 360, 10);
	},

	unmount() {
		host = null;
	},
});
