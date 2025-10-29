import type { VRM } from "@pixiv/three-vrm";
import Client from "voicevox-client";
import { CONFIG } from "../config/constants";

/**
 * VOICEVOX 音声合成クライアント
 */
export class VoiceVoxClient {
	private client: Client;

	constructor(
		serverUrl: string,
		private vrm: VRM,
	) {
		this.client = new Client(serverUrl);
	}

	/**
	 * オプションの表情付きで音声を合成・再生
	 * @param message 読み上げるテキスト
	 * @param emotion オプションの表情/感情
	 */
	async speak(message: string, emotion?: string): Promise<void> {
		console.log(`[VoiceVox] Speaking: "${message}" with emotion: ${emotion}`);

		try {
			const audioBlob = await this.synthesizeAudio(
				message,
				CONFIG.VOICEVOX_SPEAKER_ID,
			);

			// 表情を設定(指定されている場合)
			if (emotion) {
				this.setExpression(emotion);
			}

			// 音声を再生
			await this.playAudio(audioBlob);

			// 発話後に表情をリセット
			if (emotion && this.vrm.expressionManager) {
				this.vrm.expressionManager.setValue(emotion, 0.0);
			}
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

	/**
	 * VRMの表情を設定
	 */
	private setExpression(emotion: string): void {
		if (this.vrm.expressionManager) {
			this.vrm.expressionManager.setValue(emotion, 1.0);
		}
	}
}
