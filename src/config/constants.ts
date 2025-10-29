export const CONFIG = {
	/** WebSocket Firehoseサーバー URL */
	FIREHOSE_URL: "ws://localhost:8080",

	/** VOICEVOX TTSサーバー URL */
	VOICEVOX_URL: "http://127.0.0.1:50021",

	/** VOICEVOX 話者ID */
	VOICEVOX_SPEAKER_ID: 8,

	/** VRMモデルファイルのパス */
	VRM_PATH: "/natsumi.vrm",

	/** 読み込むアニメーション名のリスト */
	ANIMATION_NAMES: [
		"idle",
		"walk",
		"run",
		"wave",
		"nod",
		"dance",
		"jump",
		"look",
		"stretch",
	] as const,

	/** NavMeshの準備完了チェック間隔(ms) */
	NAVMESH_CHECK_INTERVAL: 500,

	/** カメラの初期位置 */
	CAMERA_POSITION: { x: 0, y: 1, z: 0.5 },

	/** ライトの設定 */
	LIGHT: {
		COLOR: 0xffffff,
		INTENSITY: 3,
		POSITION: { x: 5, y: 5, z: 5 },
	},
} as const;
