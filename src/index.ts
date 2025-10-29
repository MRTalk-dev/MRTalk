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

		// NavMeshを初期化
		await init();

		// コンパニオンを読み込み(VRM + アニメーション + エージェント)
		const companionLoader = new CompanionLoader();
		const companion = await companionLoader.loadAndSetup(
			world,
			systems.companionSystem,
			systems.meshProcessSystem.getNavMeshManager(),
		);

		// ネットワークをセットアップ
		const wsClient = new WebSocketClient(CONFIG.FIREHOSE_URL);
		const voiceVoxClient = new VoiceVoxClient(
			CONFIG.VOICEVOX_URL,
			companion.vrm,
		);

		const actionHandler = new ActionHandler(
			companion.entity,
			systems.companionSystem,
		);

		const queryHandler = new QueryHandler(
			world,
			systems.meshProcessSystem,
			voiceVoxClient,
			wsClient,
		);

		const router = new MessageRouter(actionHandler, queryHandler);
		wsClient.onMessage((msg) => router.route(msg));
		await wsClient.connect();

		// 音声入力を開始
		const voiceInput = new VoiceInputManager((text) => {
			console.log(text);
		});
		await voiceInput.start();

		console.log("Application の初期化が完了しました");
	} catch (error) {
		console.error("Application の初期化に失敗しました:", error);
	}
}

// アプリケーションを開始
main();
