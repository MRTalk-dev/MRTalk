import type { VRM } from "@pixiv/three-vrm";
import { init } from "recast-navigation";
import { type AnimationClip, AnimationMixer, Vector3 } from "three";
import { loadMixamoAnimation } from "../lib/mixamo/loadMixamoAnimation";
import { loadVRM } from "../lib/VRM/loadVRM";
import { VOICEVOXClient } from "./audio/VOICEVOXClient";
import { Companion } from "./companion/Companion";
import { CompanionComponent } from "./companion/CompanionComponent";
import { CONFIG } from "./config/constants";
import { SystemRegistry } from "./core/SystemRegistry";
import { WorldManager } from "./core/WorldManager";
import { NavMeshAgent, NavMeshManager } from "./navmesh/NavMeshManager";
import { ActionHandler } from "./websocket/ActionHandler";
import { MessageRouter } from "./websocket/MessageRouter";
import { QueryHandler } from "./websocket/QueryHandler";
import { WebSocketClient } from "./websocket/WebSocketClient";

async function main() {
	// Worldを作成して設定
	const worldManager = new WorldManager();
	const world = await worldManager.createWorld(
		document.getElementById("scene-container") as HTMLDivElement,
	);

	// システムとコンポーネントを登録
	const systemRegistry = new SystemRegistry();
	const systems = systemRegistry.registerSystems(world);

	// NavMeshを初期化
	await init();
	const navMesh = new NavMeshManager();

	//VOICEVOXを初期化
	const voicevox = new VOICEVOXClient(CONFIG.VOICEVOX_URL);

	const companions = new Map<string, Companion>();
	const mesh = systems.meshProcessSystem;
	if (mesh) {
		mesh.onBaked = async () => {
			try {
				const promises = CONFIG.COMPANIONS.map(async (config, index) => {
					const offset = index; // offsetを要素番号にする
					const { gltf } = await loadVRM(config.vrmPath);
					const vrm: VRM = gltf.userData.vrm;

					vrm.scene.position.set(offset, 0, 0);
					world.scene.add(vrm.scene);

					const companionEntity = world.createTransformEntity(vrm.scene);
					companionEntity.addComponent(CompanionComponent);

					const mixer = new AnimationMixer(vrm.scene);
					const animations: Record<string, AnimationClip> = {};

					// 各アニメーションを並列読み込み
					const clips = await Promise.all(
						CONFIG.ANIMATION_NAMES.map(async (name) => {
							const clip = await loadMixamoAnimation(
								`/animations/${name}.fbx`,
								vrm,
							);
							return { name, clip };
						}),
					);
					for (const { name, clip } of clips) {
						if (clip) animations[name] = clip;
					}

					const crowd = navMesh.getCrowd();
					if (!crowd) return;

					const agent = new NavMeshAgent(crowd, new Vector3(offset, 0, 0));
					const companion = new Companion(
						config,
						companionEntity,
						agent,
						vrm,
						mixer,
						animations,
						null,
					);
					companion.playAnimation("idle", true);
					companions.set(config.id, companion);
				});

				// 全てのコンパニオン読み込みが完了するまで待つ
				await Promise.all(promises);

				const wsClient = new WebSocketClient(CONFIG.FIREHOSE_URL);
				const actionHandler = new ActionHandler(companions);
				const queryHandler = new QueryHandler(
					world,
					companions,
					voicevox,
					mesh,
					wsClient,
				);

				const router = new MessageRouter(actionHandler, queryHandler);
				wsClient.onMessage((msg) => router.route(msg));
				await wsClient.connect();

				/*
				// 音声入力を開始(全コンパニオンにメッセージを送信)
				const voiceInput = new VoiceInputManager((text) => {
					voicevox.stopAll();
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
        */
			} catch (e) {
				console.error(e);
			}
		};
	}
}
main().catch((e) => console.log(e));
