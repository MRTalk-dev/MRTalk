export interface VoiceInputConfig {
	/** STTサーバーのURL */
	sttServerUrl?: string;
	/** 音声検出の音量閾値(dB) */
	volumeThreshold?: number;
	/** 無音判定時間(ミリ秒) */
	silenceTimeout?: number;
	/** 最小録音時間(ミリ秒) */
	minRecordingDuration?: number;
}

export class VoiceInputManager {
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private mediaRecorder: MediaRecorder | null = null;
	private mediaStream: MediaStream | null = null;

	private isRecording = false;
	private recordingStartTime = 0;
	private silenceTimer: number | null = null;
	private audioChunks: Blob[] = [];

	private onRecognize: (text: string) => void;

	private config: Required<VoiceInputConfig>;

	constructor(
		onRecognize: (text: string) => void,
		config: VoiceInputConfig = {},
	) {
		this.config = {
			sttServerUrl: config.sttServerUrl ?? "http://localhost:8000",
			volumeThreshold: config.volumeThreshold ?? -50,
			silenceTimeout: config.silenceTimeout ?? 1500,
			minRecordingDuration: config.minRecordingDuration ?? 500,
		};
		this.onRecognize = onRecognize;
	}

	/**
	 * 音声入力を開始
	 */
	async start(): Promise<void> {
		try {
			// マイク入力を取得
			this.mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			// AudioContextをセットアップ
			this.audioContext = new AudioContext();
			const source = this.audioContext.createMediaStreamSource(
				this.mediaStream,
			);

			// 音量分析用のAnalyserNodeを作成
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 2048;
			this.analyser.smoothingTimeConstant = 0.8;
			source.connect(this.analyser);

			// MediaRecorderをセットアップ
			this.mediaRecorder = new MediaRecorder(this.mediaStream);
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);
				}
			};
			this.mediaRecorder.onstop = () => {
				this.onRecordingStop();
			};

			console.log("[VoiceInput] Started listening...");

			// 音量監視ループを開始
			this.monitorVolume();
		} catch (error) {
			console.error("[VoiceInput] Failed to start:", error);
			throw error;
		}
	}

	/**
	 * 音声入力を停止
	 */
	stop(): void {
		if (this.mediaStream) {
			this.mediaStream.getTracks().forEach((track) => {
				track.stop();
			});
		}
		if (this.audioContext) {
			this.audioContext.close();
		}
		if (this.silenceTimer !== null) {
			clearTimeout(this.silenceTimer);
		}

		this.audioContext = null;
		this.analyser = null;
		this.mediaRecorder = null;
		this.mediaStream = null;

		console.log("[VoiceInput] Stopped");
	}

	/**
	 * 音量を監視して録音の開始/停止を制御
	 */
	private monitorVolume(): void {
		if (!this.analyser || !this.mediaRecorder) return;

		const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
		this.analyser.getByteFrequencyData(dataArray);

		// 平均音量を計算(dB)
		const average =
			dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
		const volumeDb = 20 * Math.log10(average / 255);

		// 音量が閾値を超えているか
		const isSpeaking = volumeDb > this.config.volumeThreshold;

		if (isSpeaking) {
			// 音声検出
			if (!this.isRecording) {
				this.startRecording();
			}

			// 無音タイマーをリセット
			if (this.silenceTimer !== null) {
				clearTimeout(this.silenceTimer);
				this.silenceTimer = null;
			}
		} else {
			// 無音検出
			if (this.isRecording && this.silenceTimer === null) {
				// 無音タイマーを開始
				this.silenceTimer = window.setTimeout(() => {
					this.stopRecording();
					this.silenceTimer = null;
				}, this.config.silenceTimeout);
			}
		}

		// 次のフレームで再度チェック
		requestAnimationFrame(() => this.monitorVolume());
	}

	/**
	 * 録音を開始
	 */
	private startRecording(): void {
		if (!this.mediaRecorder || this.isRecording) return;

		this.audioChunks = [];
		this.recordingStartTime = Date.now();
		this.isRecording = true;

		this.mediaRecorder.start();
		console.log("[VoiceInput] Recording started");
	}

	/**
	 * 録音を停止
	 */
	private stopRecording(): void {
		if (!this.mediaRecorder || !this.isRecording) return;

		const duration = Date.now() - this.recordingStartTime;

		// 最小録音時間をチェック
		if (duration < this.config.minRecordingDuration) {
			console.log("[VoiceInput] Recording too short, discarding");
			this.audioChunks = [];
			this.isRecording = false;
			return;
		}

		this.mediaRecorder.stop();
		this.isRecording = false;
		console.log(`[VoiceInput] Recording stopped (${duration}ms)`);
	}

	/**
	 * 録音停止時の処理
	 */
	private async onRecordingStop(): Promise<void> {
		if (this.audioChunks.length === 0) return;

		// 音声BlobをFormDataに変換
		const audioBlob = new Blob(this.audioChunks, { type: "audio/wav" });
		this.audioChunks = [];

		try {
			// STTサーバーに送信
			const formData = new FormData();
			formData.append("file", audioBlob, "audio.wav");

			const response = await fetch(this.config.sttServerUrl, {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`STT server returned ${response.status}`);
			}

			const result = await response.json();
			this.onRecognize(result.text);
		} catch (error) {
			console.error("[VoiceInput] STT request failed:", error);
		}
	}
}
