import Client from "voicevox-client";

export class VOICEVOXClient {
	private client: Client;

	constructor(serverUrl: string) {
		this.client = new Client(serverUrl);
	}

	/**
	 * オプションの表情付きで音声を合成・再生
	 * @param message 読み上げるテキスト
	 * @param emotion オプションの表情/感情
	 */
	async speak(message: string, speaker: number): Promise<void> {
		console.log(`[VoiceVox] Speaking: "${message}"`);
		try {
			const audioBlob = await this.synthesizeAudio(message, speaker);
			// 音声を再生
			await this.playAudio(audioBlob);
		} catch (error) {
			console.error("[VoiceVox] Failed to speak:", error);
			throw error;
		}
	}

	/**
	 * テキストから音声を合成
	 */
	private async synthesizeAudio(
		message: string,
		speakerId: number,
	): Promise<Blob> {
		const audioQuery = await this.client.createAudioQuery(message, speakerId);
		const audioData = await audioQuery.synthesis(1);
		return new Blob([audioData], { type: "audio/wav" });
	}

	/**
	 * 音声Blobを再生
	 */
	private async playAudio(audioBlob: Blob): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const url = URL.createObjectURL(audioBlob);
			const audio = new Audio(url);

			audio.addEventListener("ended", () => {
				URL.revokeObjectURL(url);
				resolve();
			});

			audio.addEventListener("error", (error) => {
				URL.revokeObjectURL(url);
				reject(error);
			});

			audio.play().catch(reject);
		});
	}
}
