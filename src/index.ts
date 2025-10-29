import {
	DirectionalLight,
	type Entity,
	SceneUnderstandingSystem,
	SessionMode,
	World,
	XRAnchor,
	XRMesh,
	XRPlane,
} from "@iwsdk/core";
import type { VRM } from "@pixiv/three-vrm";
import { init } from "recast-navigation";
import * as THREE from "three";
import Client from "voicevox-client";
import { loadMixamoAnimation } from "../lib/mixamo/loadMixamoAnimation";
import { loadVRM } from "../lib/VRM/loadVRM";
import { VoiceInputManager } from "./audio/VoiceInputManager";
import { CompanionComponent } from "./companion/CompanionComponent";
import { CompanionSystem } from "./companion/CompanionSystem";
import { MeshProcessSystem } from "./mesh";

const client = new Client("http://127.0.0.1:50021");

World.create(document.getElementById("scene-container") as HTMLDivElement, {
	xr: {
		sessionMode: SessionMode.ImmersiveAR,
		offer: "always",
		features: {
			handTracking: true,
			anchors: true,
			hitTest: true,
			planeDetection: true,
			meshDetection: true,
			layers: true,
		},
	},
	features: {
		locomotion: false,
		grabbing: true,
		physics: false,
		sceneUnderstanding: true,
	},
}).then(async (world) => {
	const { camera } = world;
	camera.position.set(0, 1, 0.5);
	const directionalLight = new DirectionalLight(0xffffff, 3);
	directionalLight.position.set(5, 5, 5);
	world.scene.add(directionalLight);

	world
		.registerSystem(SceneUnderstandingSystem)
		.registerSystem(MeshProcessSystem)
		.registerSystem(CompanionSystem)
		.registerComponent(XRPlane)
		.registerComponent(XRMesh)
		.registerComponent(XRAnchor)
		.registerComponent(CompanionComponent);

	const sceneUnderstandingSystem = world.getSystem(SceneUnderstandingSystem);
	if (sceneUnderstandingSystem) {
		sceneUnderstandingSystem.config.showWireFrame.value = false;
	}

	const meshProcessSystem = world.getSystem(MeshProcessSystem);
	const companionSystem = world.getSystem(CompanionSystem);

	if (meshProcessSystem && companionSystem) {
		await init();
		const navMeshManager = meshProcessSystem.getNavMeshManager();
		companionSystem.setNavMeshManager(navMeshManager);

		try {
			const { gltf } = await loadVRM("/natsumi.vrm");
			const vrm = gltf.userData.vrm;

			vrm.scene.position.set(0, 0, -1);
			world.scene.add(vrm.scene);

			const animationNames = [
				"idle",
				"walk",
				"run",
				"wave",
				"nod",
				"dance",
				"jump",
				"look",
				"stretch",
			];
			const animations: Record<string, THREE.AnimationClip> = {};

			for (const name of animationNames) {
				const clip = await loadMixamoAnimation(`/animations/${name}.fbx`, vrm);
				if (clip) {
					animations[name] = clip;
				}
			}

			const companionEntity = world.createEntity();
			companionEntity.addComponent(CompanionComponent);

			const mixer = new THREE.AnimationMixer(vrm.scene);
			companionSystem.setCompanionData(companionEntity.index, {
				vrm,
				mixer,
				animations,
				currentAction: null,
			});

			const waitForNavMesh = () => {
				if (navMeshManager.isReady()) {
					console.log("NavMesh is ready, creating agent");
					const agentIndex = navMeshManager.addAgent(vrm.scene.position);
					if (agentIndex !== null) {
						companionEntity.setValue(
							CompanionComponent,
							"agentIndex",
							agentIndex,
						);
						console.log("Companion agent created:", agentIndex);
						companionSystem.playAnimation(companionEntity, "idle", true);

						const firehoseUrl = "ws://localhost:8080";
						const ws = new WebSocket(firehoseUrl);

						ws.onmessage = (event) => {
							try {
								const json = JSON.parse(event.data.toString());
								console.log(json);
								switch (json.method) {
									case "action.send": {
										handleAction(companionEntity, companionSystem, json.params);
										break;
									}
									case "query.send": {
										handleQuery(json, ws, world, meshProcessSystem, vrm);
										break;
									}
								}
							} catch (e) {
								console.log(e);
							}
						};
					} else {
						console.error("Failed to create agent");
					}
				} else {
					console.log("Waiting for NavMesh...");
					setTimeout(waitForNavMesh, 500);
				}
			};
			waitForNavMesh();

			// STT音声入力を開始
			const voiceInput = new VoiceInputManager();
			voiceInput.start().catch((error) => {
				console.error("Failed to start voice input:", error);
			});

			console.log("Companion setup complete");
		} catch (error) {
			console.error("Failed to setup companion:", error);
		}
	}
});

function handleAction(
	entity: Entity,
	companion: CompanionSystem,
	params: { name: string; params: Record<string, unknown>; from: string },
) {
	switch (params.name) {
		case "walk":
			if (
				typeof params.params.x === "number" &&
				typeof params.params.y === "number" &&
				typeof params.params.z === "number"
			) {
				companion.walkTo(
					entity,
					new THREE.Vector3(params.params.x, params.params.y, params.params.z),
				);
			}
			break;
		case "run":
			if (
				typeof params.params.x === "number" &&
				typeof params.params.y === "number" &&
				typeof params.params.z === "number"
			) {
				companion.runTo(
					entity,
					new THREE.Vector3(params.params.x, params.params.y, params.params.z),
				);
			}
			break;
		case "gesture":
			if (typeof params.params.name === "string") {
				companion.playGesture(entity, params.params.name);
			}
			break;
	}
}

async function handleQuery(
	query: {
		id: string;
		params: { type: string; from: string; body: Record<string, unknown> };
	},
	ws: WebSocket,
	world: World,
	meshProcessSystem: MeshProcessSystem | undefined,
	vrm: VRM,
) {
	let result:
		| { success: boolean; body: Record<string, unknown> }
		| { success: boolean; error: string };

	switch (query.params.type) {
		case "speak": {
			if (typeof query.params.body.message === "string") {
				const audioquery = await client.createAudioQuery(
					query.params.body.message,
					8,
				);
				const source = await audioquery.synthesis(1);
				const blob = new Blob([source], { type: "audio/wav" });
				const url = URL.createObjectURL(blob);
				const audio = new Audio(url);

				const emotion = query.params.body.emotion;
				if (vrm.expressionManager && typeof emotion === "string") {
					vrm.expressionManager.setValue(emotion, 1.0);
				}

				await new Promise<void>((resolve) => {
					audio.addEventListener("ended", () => {
						resolve();
					});
					audio.play();
				});

				result = {
					success: true,
					body: { success: true },
				};
			} else {
				result = {
					success: false,
					error: "messageが不正です。",
				};
			}

			break;
		}
		case "objects": {
			const objects = meshProcessSystem ? meshProcessSystem.getFurniture() : [];

			result = {
				success: true,
				body: { list: objects },
			};
			break;
		}
		case "user": {
			const position = world.camera.position;
			result = {
				success: true,
				body: { x: position.x, y: position.y, z: position.z },
			};
			break;
		}
		default:
			result = {
				success: false,
				body: { error: "Unknown query type" },
			};
	}

	const response = {
		topic: "queries",
		body: {
			jsonrpc: "2.0",
			id: query.id,
			result,
		},
	};

	console.log(response);
	ws.send(JSON.stringify(response));
}
