import type { Entity, World } from "@iwsdk/core";
import type { VRM } from "@pixiv/three-vrm";
import * as THREE from "three";
import { loadMixamoAnimation } from "../../lib/mixamo/loadMixamoAnimation";
import { loadVRM } from "../../lib/VRM/loadVRM";
import { CONFIG } from "../config/constants";
import type { NavMeshManager } from "../navmesh/NavMeshManager";
import { CompanionComponent } from "./CompanionComponent";
import type { CompanionSystem } from "./CompanionSystem";

/**
 * 読み込まれたコンパニオンのデータ
 */
export interface CompanionData {
	entity: Entity;
	vrm: VRM;
	mixer: THREE.AnimationMixer;
}

/**
 * コンパニオンキャラクターの読み込みとセットアップを処理
 */
export class CompanionLoader {
	/**
	 * VRMモデルとアニメーションを読み込み、コンパニオンエンティティを作成
	 * @param world Worldインスタンス
	 * @param companionSystem コンパニオンシステムインスタンス
	 * @param navMeshManager NavMeshマネージャーインスタンス
	 * @returns 読み込まれたコンパニオンデータ
	 */
	async loadAndSetup(
		world: World,
		companionSystem: CompanionSystem,
		navMeshManager: NavMeshManager,
	): Promise<CompanionData> {
		console.log("[CompanionLoader] Starting companion setup...");

		// VRMモデルを読み込み
		const { gltf } = await loadVRM(CONFIG.VRM_PATH);
		const vrm = gltf.userData.vrm;

		// 位置を設定してシーンに追加
		vrm.scene.position.set(0, 0, -1);
		world.scene.add(vrm.scene);

		// アニメーションを読み込み
		const animations = await this.loadAnimations(vrm);

		// コンパニオンエンティティを作成
		const entity = world.createEntity();
		entity.addComponent(CompanionComponent);

		// ミキサーをセットアップしてシステムに登録
		const mixer = new THREE.AnimationMixer(vrm.scene);
		companionSystem.setCompanionData(entity.index, {
			vrm,
			mixer,
			animations,
			currentAction: null,
		});

		// NavMeshの準備を待ってエージェントを作成
		await this.waitForNavMeshAndCreateAgent(
			entity,
			vrm,
			navMeshManager,
			companionSystem,
		);

		console.log("[CompanionLoader] Companion setup complete");

		return { entity, vrm, mixer };
	}

	/**
	 * VRMモデル用のすべてのアニメーションを読み込み
	 */
	private async loadAnimations(
		vrm: VRM,
	): Promise<Record<string, THREE.AnimationClip>> {
		console.log("[CompanionLoader] Loading animations...");

		const animations: Record<string, THREE.AnimationClip> = {};

		for (const name of CONFIG.ANIMATION_NAMES) {
			try {
				const clip = await loadMixamoAnimation(`/animations/${name}.fbx`, vrm);
				if (clip) {
					animations[name] = clip;
					console.log(`[CompanionLoader] Loaded animation: ${name}`);
				}
			} catch (error) {
				console.error(
					`[CompanionLoader] Failed to load animation ${name}:`,
					error,
				);
			}
		}

		return animations;
	}

	/**
	 * NavMeshの準備が完了するまで待機してナビゲーションエージェントを作成
	 */
	private async waitForNavMeshAndCreateAgent(
		entity: Entity,
		vrm: VRM,
		navMeshManager: NavMeshManager,
		companionSystem: CompanionSystem,
	): Promise<void> {
		console.log("[CompanionLoader] Waiting for NavMesh...");

		return new Promise((resolve) => {
			const checkNavMesh = () => {
				if (navMeshManager.isReady()) {
					console.log("[CompanionLoader] NavMesh is ready, creating agent");

					const agentIndex = navMeshManager.addAgent(vrm.scene.position);

					if (agentIndex !== null) {
						entity.setValue(CompanionComponent, "agentIndex", agentIndex);
						console.log(
							`[CompanionLoader] Companion agent created: ${agentIndex}`,
						);

						// idle animation を開始
						companionSystem.playAnimation(entity, "idle", true);

						resolve();
					} else {
						console.error("[CompanionLoader] Failed to create agent");
						resolve();
					}
				} else {
					setTimeout(checkNavMesh, CONFIG.NAVMESH_CHECK_INTERVAL);
				}
			};

			checkNavMesh();
		});
	}
}
