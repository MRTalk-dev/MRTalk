import * as vad from "@ricky0123/vad-web";
import { CONFIG } from "../config/constants";

export class VoiceInputManager {
	private onRecognize: (text: string) => void;
	private audioChunks: Blob[] = [];

	constructor(onRecognize: (text: string) => void) {
		this.onRecognize = onRecognize;
	}

	/**
	 * VADの初期化と録音開始
	 */
	public async initVAD(): Promise<void> {
		const myvad = await vad.MicVAD.new({
			onSpeechStart: () => {
				console.log("Speech start detected");
			},
			onSpeechEnd: async (audio: Float32Array) => {
				console.log("Speech ended, audio length:", audio.length);
				const wavBuffer = vad.utils.encodeWAV(audio);
				this.audioChunks.push(new Blob([wavBuffer], { type: "audio/wav" }));
				await this.onRecordingStop();
			},
			onnxWASMBasePath:
				"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
			baseAssetPath:
				"https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
		});

		myvad.start();
	}

	/**
	 * 録音停止時の処理
	 */
	public async onRecordingStop(): Promise<void> {
		if (this.audioChunks.length === 0) return;

		const audioBlob = new Blob(this.audioChunks, { type: "audio/wav" });
		this.audioChunks = [];

		try {
			const formData = new FormData();
			formData.append("file", audioBlob, "audio.wav");

			const response = await fetch(CONFIG.STT_URL, {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`STT server returned ${response.status}`);
			}

			const result = await response.json();
			this.onRecognize(result.text);
		} catch (error) {
			console.error("[VoiceInputManager] STT request failed:", error);
		}
	}
}
