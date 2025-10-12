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
 * ECS System for managing AI companions
 * Orchestrates animation, movement, and state controllers
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
		// Update NavMesh crowd simulation
		if (this.navMeshManager) {
			this.navMeshManager.update(delta);
		}

		// Update each companion
		for (const entity of this.queries.companions.entities) {
			this.updateCompanion(entity, delta);
		}
	}

	private updateCompanion(entity: Entity, delta: number) {
		const data = this.companionDataMap.get(entity.index);
		if (!data || !data.vrm || !data.mixer) return;

		// Update VRM and animations
		data.vrm.update(delta);
		data.mixer.update(delta);

		// Get current state
		const state = this.stateManager.getCurrentState(entity);
		const hasTarget = this.stateManager.hasTarget(entity);
		const agentIndex = this.stateManager.getAgentIndex(entity);

		// Handle movement states (Walk/Run)
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

		// Update position
		this.movementController.updatePosition(data.vrm.scene, agentPos);

		if (!hasTarget) return;

		// Check arrival
		if (this.movementController.checkArrival(agentVel)) {
			this.transitionToIdle(entity);
			return;
		}

		// Update rotation to face movement direction
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

		// Set walk speed and target
		this.navMeshManager.setAgentSpeed(agentIndex, 1.0);
		this.navMeshManager.setAgentTarget(agentIndex, target);

		// Transition state
		this.stateManager.transitionToWalk(entity);
		this.playAnimation(entity, "walk", true);
	}

	runTo(entity: Entity, target: THREE.Vector3) {
		const agentIndex = this.stateManager.getAgentIndex(entity);
		if (!this.navMeshManager || agentIndex === null) {
			console.warn("NavMeshManager not ready or agent not created");
			return;
		}

		// Set run speed (2.5x faster than walk)
		this.navMeshManager.setAgentSpeed(agentIndex, 2.5);
		this.navMeshManager.setAgentTarget(agentIndex, target);

		// Transition state
		this.stateManager.transitionToRun(entity);
		this.playAnimation(entity, "run", true);
	}

	playGesture(entity: Entity, gestureName: string) {
		const data = this.companionDataMap.get(entity.index);
		if (!data || !data.animations[gestureName]) {
			console.warn(`Gesture ${gestureName} not found`);
			return;
		}

		// Transition to gesture state
		this.stateManager.transitionToGesture(entity, gestureName);

		// Play gesture animation (non-looping, return to idle when finished)
		this.playAnimation(entity, gestureName, false, () => {
			this.transitionToIdle(entity);
		});
	}
}
