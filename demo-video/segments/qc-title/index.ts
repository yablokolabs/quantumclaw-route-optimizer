import { defineSegment } from "videowright";
import { enterHud, hudScene, OPTS, rise } from "../../components/hud";

let host: HTMLElement | null = null;

export default defineSegment({
	id: "qc-title",
	advances: [4.35, 9.05],
	voiceover:
		"QuantumClaw Route Optimizer. A skill for your coding agent. It runs three solvers on your delivery problem and hands you one ranked plan.",
	notes: "Title card: skill name, then the agents it runs in, bracketed by a dimension line.",

	mount(el) {
		host = el;
		el.innerHTML = hudScene(
			"AGENT SKILL &middot; QUANTUMCLAW",
			`
      <div data-ref="kicker" style="
        position: absolute; left: 56px; top: 190px;
        font-family: var(--font-mono); font-size: 40px; color: var(--cyan); opacity: 0;
      ">quantumclaw-route-optimizer</div>
      <div data-ref="headline" style="
        position: absolute; left: 56px; top: 260px; right: 56px;
        font-family: var(--font-display); font-weight: 500; font-size: 150px;
        line-height: 1.0; letter-spacing: -0.02em; opacity: 0;
      ">Benchmark your<br/>delivery routes</div>
      <svg data-ref="dim" style="position: absolute; left: 56px; top: 600px; overflow: visible;" width="1680" height="60">
        <line x1="0" y1="20" x2="1680" y2="20" stroke="var(--cyan)" stroke-width="2" style="transform-origin: 0 20px; transform: scaleX(0);" />
        <line x1="0" y1="6" x2="0" y2="34" stroke="var(--cyan)" stroke-width="2" style="opacity: 0;" />
        <line x1="1680" y1="6" x2="1680" y2="34" stroke="var(--cyan)" stroke-width="2" style="opacity: 0;" />
      </svg>
      <div data-ref="sub" style="
        position: absolute; left: 56px; top: 680px; right: 56px;
        font-family: var(--font-display); font-size: 56px; color: var(--color-muted); opacity: 0;
      ">Classical &middot; simulated annealing &middot; quantum annealing emulator</div>
      <div data-ref="agents" style="
        position: absolute; left: 56px; top: 780px;
        font-family: var(--font-mono); font-size: 36px; color: var(--color-fg); opacity: 0;
      ">Claude Code &middot; Codex &middot; Cursor &middot; any SKILL.md agent</div>
    `,
			"<span>X -46.6300</span><span>Y -23.5500</span><span>DEPOT SP</span><span style=\"margin-left: auto;\">YABLOKO LABS</span>",
		);
	},

	async play(ctx) {
		if (!host) return;
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		enterHud(host);
		rise(q("kicker"), 300);
		rise(q("headline"), 500, 500, 20);

		await ctx.waitForNext();

		const [main, tickL, tickR] = Array.from(q("dim").querySelectorAll("line"));
		main.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { ...OPTS, duration: 600 });
		tickL.animate([{ opacity: 0 }, { opacity: 1 }], { ...OPTS, duration: 150 });
		tickR.animate([{ opacity: 0 }, { opacity: 1 }], { ...OPTS, duration: 150, delay: 550 });
		rise(q("sub"), 250);
		rise(q("agents"), 500);
	},

	unmount() {
		host = null;
	},
});
