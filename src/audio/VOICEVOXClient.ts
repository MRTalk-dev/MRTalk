import Client from "voicevox-client";

export class VOICEVOXClient {
	private client: Client;
	private activeAudios: Set<HTMLAudioElement> = new Set();

	constructor(serverUrl: string) {
		this.client = new Client(serverUrl);
	}

	/**
	 * オプションの表情付きで音声を合成・再生
	 * @param message 読み上げるテキスト
	 * @param speaker 話者ID
	 */
	async speak(message: string, speaker: number): Promise<void> {
		console.log(`[VoiceVox] Speaking: "${message}"`);
		try {
			const audioBlob = await this.synthesizeAudio(message, speaker);
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
		const audioData = await audioQuery.synthesis(speakerId);
		return new Blob([audioData], { type: "audio/wav" });
	}

	/**
	 * 音声Blobを再生
	 */
	private async playAudio(audioBlob: Blob): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const url = URL.createObjectURL(audioBlob);
			const audio = new Audio(url);

			// 再生リストに追加
			this.activeAudios.add(audio);

			audio.addEventListener("ended", () => {
				this.activeAudios.delete(audio);
				URL.revokeObjectURL(url);
				resolve();
			});

			audio.addEventListener("error", (error) => {
				this.activeAudios.delete(audio);
				URL.revokeObjectURL(url);
				reject(error);
			});

			audio.play().catch(reject);
		});
	}

	/**
	 * すべての再生中の音声を停止
	 */
	stopAll(): void {
		for (const audio of this.activeAudios) {
			try {
				audio.pause();
				audio.currentTime = 0; // 再生位置リセット
				URL.revokeObjectURL(audio.src); // メモリ解放
			} catch (e) {
				console.warn("[VoiceVox] Failed to stop audio:", e);
			}
		}
		this.activeAudios.clear();
		console.log("[VoiceVox] All audio stopped");
	}
}
