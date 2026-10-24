import { defineSegment } from "videowright";
import { enterHud, hudScene, rise } from "../../components/hud";
import { pipelineDiagram, revealStep } from "../../components/pipeline-diagram";

let host: HTMLElement | null = null;

const PROMPT = "Find a better plan for today's São Paulo stops.";

export default defineSegment({
	id: "qc-prompt",
	advances: [3.45, 10.12],
	voiceover:
		"You give your agent a stop list and your current routes. The agent checks the data, runs each solver five times, keeps the best feasible plan, and writes a report.",
	notes: "Buyer prompt, then the skill's pipeline as a diagram-design data-flow diagram, revealed step by step.",

	mount(el) {
		host = el;
		const words = PROMPT.split(" ")
			.map((word) => `<span style="opacity: 0;">${word}</span>`)
			.join(" ");

		el.innerHTML = hudScene(
			"SESSION &middot; CLAUDE CODE",
			`
      <div data-ref="you" style="
        position: absolute; left: 56px; top: 120px;
        font-family: var(--font-mono); font-size: 30px; color: var(--color-accent); opacity: 0;
      ">&rsaquo; BUYER</div>
      <div data-ref="prompt" style="
        position: absolute; left: 56px; top: 168px; right: 56px;
        font-family: var(--font-display); font-size: 72px; line-height: 1.1;
      ">${words}</div>
      <div style="position: absolute; left: 56px; top: 330px;">${pipelineDiagram()}</div>
    `,
			"<span>SKILL.md LOADED</span><span>5 SEEDS PER SOLVER</span><span style=\"margin-left: auto;\">OFFLINE &middot; NO API KEYS</span>",
		);
	},

	async play(ctx) {
		if (!host) return;
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		enterHud(host);
		rise(q("you"), 200, 300, 8);
		q("prompt")
			.querySelectorAll("span")
			.forEach((word, i) => {
				word.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: 350 + i * 120, fill: "forwards" });
			});
		revealStep(host, "input", 1800);

		await ctx.waitForNext();

		// Paced to the narration: checks → runs each solver → keeps the best → writes a report.
		revealStep(host, "validate", 300);
		revealStep(host, "solver-0", 1300);
		revealStep(host, "solver-1", 1550);
		revealStep(host, "solver-2", 1800);
		revealStep(host, "rank", 3400);
		revealStep(host, "report", 4800);
		revealStep(host, "legend", 5400);
	},

	unmount() {
		host = null;
	},
});
