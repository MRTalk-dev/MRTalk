import type { Entity } from "@iwsdk/core";
import { createSystem } from "@iwsdk/core";
import type { VRM } from "@pixiv/three-vrm";
import type * as THREE from "three";
import type { NavMeshManager } from "../navmesh/NavMeshManager";
import { CompanionAnimationController } from "./CompanionAnimationController";
import { CompanionComponent, CompanionState } from "./CompanionComponent";
import { CompanionMovementController } from "./CompanionMovementController";
import { CompanionStateManager } from "./CompanionStateManager";

interface CompanionData {
	vrm: VRM;
	mixer: THREE.AnimationMixer;
	animations: Record<string, THREE.AnimationClip>;
	currentAction: THREE.AnimationAction | null;
}

/**
 * AI companion を管理する ECS System
 * animation、movement、state controller を統括
 */
export class CompanionSystem extends createSystem({
	companions: { required: [CompanionComponent] },
}) {
	private navMeshManager: NavMeshManager | null = null;
	private companionDataMap = new Map<number, CompanionData>();

	private animationController = new CompanionAnimationController();
	private movementController = new CompanionMovementController();
	private stateManager = new CompanionStateManager();

	setNavMeshManager(manager: NavMeshManager) {
		this.navMeshManager = manager;
	}

	setCompanionData(entityIndex: number, data: CompanionData) {
		this.companionDataMap.set(entityIndex, data);
	}

	getCompanionData(entityIndex: number): CompanionData | undefined {
		return this.companionDataMap.get(entityIndex);
	}

	update(delta: number) {
		// NavMesh crowd simulation を更新
		if (this.navMeshManager) {
			this.navMeshManager.update(delta);
		}

		// 各 companion を更新
		for (const entity of this.queries.companions.entities) {
			this.updateCompanion(entity, delta);
		}
	}

	private updateCompanion(entity: Entity, delta: number) {
		const data = this.companionDataMap.get(entity.index);
		if (!data || !data.vrm || !data.mixer) return;

		// VRM と animation を更新
		data.vrm.update(delta);
		data.mixer.update(delta);

		// 現在の state を取得
		const state = this.stateManager.getCurrentState(entity);
		const hasTarget = this.stateManager.hasTarget(entity);
		const agentIndex = this.stateManager.getAgentIndex(entity);

		// 移動 state (Walk/Run) を処理
		if (
			(state === CompanionState.Walk || state === CompanionState.Run) &&
			agentIndex !== null &&
			this.navMeshManager
		) {
			this.updateMovement(entity, data, hasTarget, agentIndex);
		}
	}

	private updateMovement(
		entity: Entity,
		data: CompanionData,
		hasTarget: boolean,
		agentIndex: number,
	) {
		if (!this.navMeshManager) return;

		const agentPos = this.navMeshManager.getAgentPosition(agentIndex);
		const agentVel = this.navMeshManager.getAgentVelocity(agentIndex);

		if (!agentPos || !agentVel) return;

		// 位置を更新
		this.movementController.updatePosition(data.vrm.scene, agentPos);

		if (!hasTarget) return;

		// 到着を確認
		if (this.movementController.checkArrival(agentVel)) {
			this.transitionToIdle(entity);
			return;
		}

		// 移動方向を向くように回転を更新
		this.movementController.updateRotation(data.vrm.scene, agentVel);
	}

	private transitionToIdle(entity: Entity) {
		this.stateManager.transitionToIdle(entity);
		this.playAnimation(entity, "idle", true);
	}

	playAnimation(
		entity: Entity,
		animationName: string,
		loop: boolean,
		onFinished?: () => void,
	) {
		const data = this.companionDataMap.get(entity.index);
		if (!data || !data.mixer) {
			console.warn("Companion data or mixer not found");
			return;
		}

		const newAction = this.animationController.playAnimation(
			data.mixer,
			data.animations,
			data.currentAction,
			animationName,
			loop,
			onFinished,
		);

		if (newAction) {
			data.currentAction = newAction;
		}
	}

	walkTo(entity: Entity, target: THREE.Vector3) {
		const agentIndex = this.stateManager.getAgentIndex(entity);
		if (!this.navMeshManager || agentIndex === null) {
			console.warn("NavMeshManager not ready or agent not created");
			return;
		}

		// walk speed と target を設定
		this.navMeshManager.setAgentSpeed(agentIndex, 1.0);
		this.navMeshManager.setAgentTarget(agentIndex, target);

		// state を遷移
		this.stateManager.transitionToWalk(entity);
		this.playAnimation(entity, "walk", true);
	}

	runTo(entity: Entity, target: THREE.Vector3) {
		const agentIndex = this.stateManager.getAgentIndex(entity);
		if (!this.navMeshManager || agentIndex === null) {
			console.warn("NavMeshManager not ready or agent not created");
			return;
		}

		// run speed を設定(walk の 2.5 倍)
		this.navMeshManager.setAgentSpeed(agentIndex, 2.5);
		this.navMeshManager.setAgentTarget(agentIndex, target);

		// state を遷移
		this.stateManager.transitionToRun(entity);
		this.playAnimation(entity, "run", true);
	}

	playGesture(entity: Entity, gestureName: string) {
		const data = this.companionDataMap.get(entity.index);
		if (!data || !data.animations[gestureName]) {
			console.warn(`Gesture ${gestureName} not found`);
			return;
		}

		// gesture state へ遷移
		this.stateManager.transitionToGesture(entity, gestureName);

		// gesture animation を再生(非ループ、完了後 idle に戻る)
		this.playAnimation(entity, gestureName, false, () => {
			this.transitionToIdle(entity);
		});
	}
}
