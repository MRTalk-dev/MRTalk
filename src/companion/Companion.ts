import type { Entity } from "@iwsdk/core";
import type { VRM } from "@pixiv/three-vrm";
import type * as THREE from "three";
import type { CompanionConfig } from "../config/constants";
import type { NavMeshAgent } from "../navmesh/NavMeshManager";
import { AnimationController } from "./AnimationController";
import { CompanionState } from "./CompanionComponent";
import { MovementController } from "./MovementController";
import { StateManager } from "./StateManager";

export class Companion {
	config: CompanionConfig;
	private animationController = new AnimationController();
	private movementController = new MovementController();
	private stateManager = new StateManager();

	private entity: Entity;
	private agent: NavMeshAgent;

	private vrm: VRM;
	private mixer: THREE.AnimationMixer;
	private animations: Record<string, THREE.AnimationClip>;
	private currentAction: THREE.AnimationAction | null;

	constructor(
		config: CompanionConfig,
		entity: Entity,
		agent: NavMeshAgent,
		vrm: VRM,
		mixer: THREE.AnimationMixer,
		animations: Record<string, THREE.AnimationClip>,
		currentAction: THREE.AnimationAction | null,
	) {
		this.config = config;

		this.entity = entity;
		this.agent = agent;

		this.vrm = vrm;
		this.mixer = mixer;
		this.animations = animations;
		this.currentAction = currentAction;
	}

	update(delta: number) {
		this.updateCompanion(delta);
	}

	private updateCompanion(delta: number) {
		if (!this.vrm || !this.mixer) return;

		// VRM と animation を更新
		this.vrm.update(delta);
		this.mixer.update(delta);

		// 現在の state を取得
		const state = this.stateManager.getCurrentState(this.entity);
		const hasTarget = this.stateManager.hasTarget(this.entity);

		// 移動 state (Walk/Run) を処理
		if (state === CompanionState.Walk || state === CompanionState.Run) {
			this.updateMovement(hasTarget);
		}
	}

	private updateMovement(hasTarget: boolean) {
		const agentPos = this.agent.getPosition();
		const agentVel = this.agent.getVelocity();

		if (!agentPos || !agentVel) return;

		// 位置を更新
		this.movementController.updatePosition(this.vrm.scene, agentPos);

		if (!hasTarget) return;

		// 到着を確認
		if (this.movementController.checkArrival(agentVel)) {
			this.transitionToIdle();
			return;
		}

		// 移動方向を向くように回転を更新
		this.movementController.updateRotation(this.vrm.scene, agentVel);
	}

	private transitionToIdle() {
		this.stateManager.transitionToIdle(this.entity);
		this.playAnimation("idle", true);
	}

	playAnimation(animationName: string, loop: boolean, onFinished?: () => void) {
		if (!this.mixer) {
			console.warn("mixer not found");
			return;
		}

		const newAction = this.animationController.playAnimation(
			this.mixer,
			this.animations,
			this.currentAction,
			animationName,
			loop,
			onFinished,
		);

		if (newAction) {
			this.currentAction = newAction;
		}
	}

	walkTo(target: THREE.Vector3) {
		// walk speed と target を設定
		this.agent.setSpeed(1.0);
		this.agent.setTarget(target);

		// state を遷移
		this.stateManager.transitionToWalk(this.entity);
		this.playAnimation("walk", true);
	}

	runTo(target: THREE.Vector3) {
		// run speed を設定(walk の 2.5 倍)
		this.agent.setSpeed(2.5);
		this.agent.setTarget(target);

		// state を遷移
		this.stateManager.transitionToRun(this.entity);
		this.playAnimation("run", true);
	}

	playGesture(gestureName: string) {
		if (!this.animations[gestureName]) {
			console.warn(`Gesture ${gestureName} not found`);
			return;
		}

		// gesture state へ遷移
		this.stateManager.transitionToGesture(this.entity, gestureName);

		// gesture animation を再生(非ループ、完了後 idle に戻る)
		this.playAnimation(gestureName, false, () => {
			this.transitionToIdle();
		});
	}

	setExpression(emotion: string): void {
		if (this.vrm.expressionManager) {
			this.vrm.expressionManager.setValue(emotion, 1.0);
		}
	}
}
