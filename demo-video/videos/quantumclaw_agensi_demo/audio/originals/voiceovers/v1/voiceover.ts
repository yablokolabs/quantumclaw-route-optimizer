import type { Voiceover } from "videowright";
import { perSegment } from "./timing";

// Generated locally with Kokoro (kokoro-onnx, voice bf_emma). ElevenLabs was
// unreachable from the build environment. `provider: "manual"` because
// Videowright has no Kokoro provider; regenerate with generate.py.
const voiceover: Voiceover = {
	audio_file: "./audio.mp3",
	provider: "manual",
	provider_timing_file: "./timing.json",
	voice: "bf_emma",
	model: "kokoro-v1.0",
	timing: { perSegment },
	notes: "British female, clear and even. One clip per beat, so beat boundaries are exact.",
};

export default voiceover;
