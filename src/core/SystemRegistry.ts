import {
	SceneUnderstandingSystem,
	type World,
	XRAnchor,
	XRMesh,
	XRPlane,
} from "@iwsdk/core";
import { CompanionComponent } from "../companion/CompanionComponent";
import { CompanionSystem } from "../companion/CompanionSystem";
import { MeshProcessSystem } from "../mesh";

/**
 * 登録されたシステムへの参照
 */
export interface SystemReferences {
	sceneUnderstandingSystem: SceneUnderstandingSystem | undefined;
	meshProcessSystem: MeshProcessSystem | undefined;
	companionSystem: CompanionSystem | undefined;
}

/**
 * システムとコンポーネントの登録を管理
 */
export class SystemRegistry {
	/**
	 * すべてのシステムとコンポーネントをWorldに登録
	 * @param world Worldインスタンス
	 * @returns 登録されたシステムへの参照
	 */
	registerSystems(world: World): SystemReferences {
		// system を登録
		world
			.registerSystem(SceneUnderstandingSystem)
			.registerSystem(MeshProcessSystem)
			.registerSystem(CompanionSystem);

		// component を登録
		world
			.registerComponent(XRPlane)
			.registerComponent(XRMesh)
			.registerComponent(XRAnchor)
			.registerComponent(CompanionComponent);

		// system 参照を取得
		const sceneUnderstandingSystem = world.getSystem(SceneUnderstandingSystem);
		const meshProcessSystem = world.getSystem(MeshProcessSystem);
		const companionSystem = world.getSystem(CompanionSystem);

		// system を設定
		this.configureSceneUnderstanding(sceneUnderstandingSystem);
		this.linkNavMeshToCompanion(meshProcessSystem, companionSystem);

		return {
			sceneUnderstandingSystem,
			meshProcessSystem,
			companionSystem,
		};
	}

	/**
	 * SceneUnderstandingを設定
	 */
	private configureSceneUnderstanding(
		system: SceneUnderstandingSystem | undefined,
	): void {
		if (system) {
			system.config.showWireFrame.value = false;
		}
	}

	/**
	 * NavMeshマネージャーをコンパニオンシステムにリンク
	 */
	private linkNavMeshToCompanion(
		meshProcessSystem: MeshProcessSystem | undefined,
		companionSystem: CompanionSystem | undefined,
	): void {
		if (meshProcessSystem && companionSystem) {
			const navMeshManager = meshProcessSystem.getNavMeshManager();
			companionSystem.setNavMeshManager(navMeshManager);
		}
	}
}
