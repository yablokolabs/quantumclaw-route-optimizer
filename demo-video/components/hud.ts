/**
 * Shared Motion Engineering scene chrome: blueprint grid, framed content area
 * with amber corner ticks, a mono tag line, and a bottom coordinate strip.
 */

export const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
export const OPTS = { fill: "forwards" as const, easing: EASE };

function cornerTicks(): string {
	const tick = (v: "top" | "bottom", h: "left" | "right") => `
    <div style="position: absolute; ${h}: -1px; ${v}: -1px; width: 32px; height: 32px;">
      <div style="position: absolute; ${h}: 0; ${v}: 0; width: 32px; height: 2px; background: var(--color-accent);"></div>
      <div style="position: absolute; ${h}: 0; ${v}: 0; width: 2px; height: 32px; background: var(--color-accent);"></div>
    </div>`;
	return tick("top", "left") + tick("top", "right") + tick("bottom", "left") + tick("bottom", "right");
}

/** Full-bleed scene shell. `body` is placed inside the framed content area. */
export function hudScene(tag: string, body: string, coords: string): string {
	return `
    <div style="
      position: relative; height: 100%;
      background: var(--color-bg); color: var(--color-fg);
      font-family: var(--font-body); overflow: hidden;
    ">
      <div style="
        position: absolute; inset: 0; pointer-events: none;
        background:
          linear-gradient(var(--grid-line) 1px, transparent 1px) 0 0 / 64px 64px,
          linear-gradient(90deg, var(--grid-line) 1px, transparent 1px) 0 0 / 64px 64px;
      "></div>
      <div data-ref="frame" style="
        position: absolute; inset: 56px 64px 72px;
        border: 1px solid var(--color-border); opacity: 0;
      ">
        ${cornerTicks()}
        <div data-ref="tag" style="
          position: absolute; left: 56px; top: 40px;
          font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.22em;
          color: var(--color-accent); opacity: 0;
        ">&#9698; ${tag}</div>
        ${body}
      </div>
      <div data-ref="coords" style="
        position: absolute; left: 64px; right: 64px; bottom: 22px;
        display: flex; gap: 40px;
        font-family: var(--font-mono); font-size: 20px; letter-spacing: 0.1em;
        color: var(--color-muted); opacity: 0;
      ">${coords}</div>
    </div>`;
}

/** Frame, tag and coordinate strip entrance shared by every scene. */
export function enterHud(host: HTMLElement): void {
	const q = (ref: string) => host.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
	q("frame").animate([{ opacity: 0 }, { opacity: 1 }], { ...OPTS, duration: 360 });
	q("coords").animate([{ opacity: 0 }, { opacity: 1 }], { ...OPTS, duration: 360, delay: 100 });
	q("tag").animate(
		[
			{ opacity: 0, transform: "translateX(-12px)" },
			{ opacity: 1, transform: "translateX(0)" },
		],
		{ ...OPTS, duration: 360, delay: 200 },
	);
}

/** Fade-and-rise entrance for a single element. */
export function rise(el: Element, delay = 0, duration = 420, distance = 14): void {
	(el as HTMLElement).animate(
		[
			{ opacity: 0, transform: `translateY(${distance}px)` },
			{ opacity: 1, transform: "translateY(0)" },
		],
		{ ...OPTS, duration, delay },
	);
}

/** Stepped number tick (Motion Engineering numbers flip, they don't glide). */
export function tickNumber(
	el: HTMLElement,
	to: number,
	opts: { from?: number; decimals?: number; prefix?: string; suffix?: string; steps?: number; stepMs?: number },
): void {
	const { from = 0, decimals = 0, prefix = "", suffix = "", steps = 14, stepMs = 45 } = opts;
	for (let i = 0; i <= steps; i++) {
		setTimeout(() => {
			const value = from + ((to - from) * i) / steps;
			el.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
		}, i * stepMs);
	}
}
