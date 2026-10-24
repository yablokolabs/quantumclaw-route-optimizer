import "../../styles/motion-engineering/tokens.css";
import type { Timeline } from "videowright";
import defaultAudioTrack from "./audio/tracks/v1/track";

const timeline: Timeline = {
	meta: {
		title: "QuantumClaw Route Optimizer · Agensi demo",
	},
	segments: [
		{ id: "qc-title" },
		{ id: "qc-prompt", transition: "fade" },
		{ id: "qc-problem", transition: "fade" },
		{ id: "qc-benchmark", transition: "fade" },
		{ id: "qc-routes", transition: "fade" },
		{ id: "qc-savings", transition: "fade" },
		{ id: "qc-cta", transition: "fade" },
	],
	default_audio_track: defaultAudioTrack,
};
export default timeline;
