import { init } from "recast-navigation";
import { VoiceInputManager } from "./audio/VoiceInputManager";
import { VoiceVoxClient } from "./audio/VoiceVoxClient";
import { CompanionLoader } from "./companion/CompanionLoader";
import { CONFIG } from "./config/constants";
import { SystemRegistry } from "./core/SystemRegistry";
import { WorldManager } from "./core/WorldManager";
import { ActionHandler } from "./networking/ActionHandler";
import { MessageRouter } from "./networking/MessageRouter";
import { QueryHandler } from "./networking/QueryHandler";
import { WebSocketClient } from "./networking/WebSocketClient";

async function main() {
	try {
		// Worldを作成して設定
		const worldManager = new WorldManager();
		const world = await worldManager.createWorld(
			document.getElementById("scene-container") as HTMLDivElement,
		);

		// システムとコンポーネントを登録
		const systemRegistry = new SystemRegistry();
		const systems = systemRegistry.registerSystems(world);

		// 必要なシステムが利用可能か確認
		if (!systems.meshProcessSystem || !systems.companionSystem) {
			throw new Error("Required systems failed to initialize");
		}

		const companionSystem = systems.companionSystem;
		const meshProcessSystem = systems.meshProcessSystem;

		// NavMeshを初期化
		await init();

		// 複数のコンパニオンを読み込み(VRM + アニメーション + エージェント)
		const companionLoader = new CompanionLoader();
		const companions = await Promise.all(
			CONFIG.COMPANIONS.map((config, index) =>
				companionLoader.loadAndSetup(
					world,
					companionSystem,
					meshProcessSystem.getNavMeshManager(),
					config,
					index * 0.5, // 横に0.5mずつずらして配置
				),
			),
		);

		// ID -> CompanionDataのマップを作成
		const companionMap = new Map(
			companions.map((companion) => [companion.id, companion]),
		);

		// ID -> VoiceVoxClientのマップを作成
		const voiceClientMap = new Map(
			CONFIG.COMPANIONS.map((config) => {
				const companion = companionMap.get(config.id);
				if (!companion) {
					throw new Error(`Companion not found: ${config.id}`);
				}
				return [
					config.id,
					new VoiceVoxClient(CONFIG.VOICEVOX_URL, companion.vrm),
				];
			}),
		);

		// ネットワークをセットアップ
		const wsClient = new WebSocketClient(CONFIG.FIREHOSE_URL);

		const actionHandler = new ActionHandler(
			companionMap,
			systems.companionSystem,
		);

		const queryHandler = new QueryHandler(
			world,
			systems.meshProcessSystem,
			voiceClientMap,
			wsClient,
		);

		const router = new MessageRouter(actionHandler, queryHandler);
		wsClient.onMessage((msg) => router.route(msg));
		await wsClient.connect();

		// 音声入力を開始(全コンパニオンにメッセージを送信)
		const voiceInput = new VoiceInputManager((text) => {
			console.log(`[VoiceInput] Recognized: ${text}`);

			// 全コンパニオンIDを取得
			const companionIds = CONFIG.COMPANIONS.map((c) => c.id);

			// 全コンパニオンにメッセージを送信
			wsClient.send({
				topic: "messages",
				body: {
					jsonrpc: "2.0",
					method: "message.send",
					params: {
						id: crypto.randomUUID(),
						from: "user",
						to: companionIds,
						message: text,
					},
				},
			});
		});
		await voiceInput.start();
	} catch (error) {
		console.error(error);
	}
}

main();
