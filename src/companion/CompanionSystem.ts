import type { Entity } from "@iwsdk/core";
import { createSystem } from "@iwsdk/core";
import type { VRM } from "@pixiv/three-vrm";
import * as THREE from "three";
import type { NavMeshManager } from "../navmesh/NavMeshManager";
import { CompanionComponent, CompanionState } from "./CompanionComponent";

interface CompanionData {
	vrm: VRM;
	mixer: THREE.AnimationMixer;
	animations: Record<string, THREE.AnimationClip>;
	currentAction: THREE.AnimationAction | null;
}

export class CompanionSystem extends createSystem({
	companions: { required: [CompanionComponent] },
}) {
	private navMeshManager: NavMeshManager | null = null;
	private companionDataMap = new Map<number, CompanionData>();

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
		if (this.navMeshManager) {
			this.navMeshManager.update(delta);
		}

		//各コンパニオンの描画を更新する
		for (const entity of this.queries.companions.entities) {
			const data = this.companionDataMap.get(entity.index);
			if (!data) continue;

			//現在の状態をComponentから取得
			const state = entity.getValue(CompanionComponent, "state");
			const hasTarget = entity.getValue(CompanionComponent, "hasTarget");
			const agentIndex = entity.getValue(CompanionComponent, "agentIndex");
			if (!data.vrm || !data.mixer) continue;

			data.vrm.update(delta);
			data.mixer.update(delta);

			//歩き/走り時のアニメーション処理
			if (
				(state === CompanionState.Walk || state === CompanionState.Run) &&
				agentIndex !== null &&
				agentIndex >= 0
			) {
				if (!this.navMeshManager) continue;

				//NavMesh Agentの速度と位置をとる(毎フレーム)
				const agentPos = this.navMeshManager.getAgentPosition(agentIndex);
				const agentVel = this.navMeshManager.getAgentVelocity(agentIndex);

				if (agentPos) {
					data.vrm.scene.position.copy(agentPos);
					if (hasTarget && agentVel) {
						const speed = agentVel.length();
						//スピードが遅ければ止まる
						if (speed < 0.1) {
							this.transitionToIdle(entity);
						} else {
							//進行方向を向く
							const lookDirection = agentVel.clone().normalize();
							if (lookDirection.lengthSq() > 0) {
								const targetPoint = new THREE.Vector3().addVectors(
									data.vrm.scene.position,
									lookDirection,
								);

								const currentRotation = data.vrm.scene.quaternion.clone();
								data.vrm.scene.lookAt(targetPoint);
								const targetRotation = data.vrm.scene.quaternion.clone();

								data.vrm.scene.quaternion.copy(currentRotation);
								data.vrm.scene.quaternion.slerp(targetRotation, 0.1);
							}
						}
					}
				}
			}
		}
	}

	//idleに戻る
	private transitionToIdle(entity: Entity) {
		entity.setValue(CompanionComponent, "state", CompanionState.Idle);
		entity.setValue(CompanionComponent, "hasTarget", false);
		this.playAnimation(entity, "idle", true);
	}

	playAnimation(
		entity: Entity,
		animationName: string,
		loop: boolean,
		onFinished?: () => void,
	) {
		const data = this.companionDataMap.get(entity.index);
		if (!data || !data.mixer || !data.animations[animationName]) {
			console.warn(`Animation ${animationName} not found`);
			return;
		}

		const newClip = data.animations[animationName];
		const newAction = data.mixer.clipAction(newClip);

		if (data.currentAction && data.currentAction !== newAction) {
			data.currentAction.fadeOut(0.3);
		}

		//アニメーションをクロスフェード
		newAction.reset();
		newAction.fadeIn(0.3);
		newAction.setLoop(
			loop ? THREE.LoopRepeat : THREE.LoopOnce,
			loop ? Infinity : 1,
		);
		newAction.clampWhenFinished = true;
		newAction.play();

		//loopではない場合コールバックを実行
		if (!loop && onFinished) {
			const onFinishedHandler = (e: { action: THREE.AnimationAction }) => {
				if (e.action === newAction) {
					data.mixer?.removeEventListener("finished", onFinishedHandler);
					onFinished();
				}
			};
			data.mixer.addEventListener("finished", onFinishedHandler);
		}

		data.currentAction = newAction;
	}

	//歩く
	walkTo(entity: Entity, target: THREE.Vector3) {
		const agentIndex = entity.getValue(CompanionComponent, "agentIndex");
		if (!this.navMeshManager || agentIndex === null || agentIndex < 0) {
			console.warn("NavMeshManager not ready or agent not created");
			return;
		}

		this.navMeshManager.setAgentSpeed(agentIndex, 1.0);
		this.navMeshManager.setAgentTarget(agentIndex, target);

		entity.setValue(CompanionComponent, "state", CompanionState.Walk);
		entity.setValue(CompanionComponent, "hasTarget", true);

		this.playAnimation(entity, "walk", true);
	}

	//走る
	runTo(entity: Entity, target: THREE.Vector3) {
		const agentIndex = entity.getValue(CompanionComponent, "agentIndex");
		if (!this.navMeshManager || agentIndex === null || agentIndex < 0) {
			console.warn("NavMeshManager not ready or agent not created");
			return;
		}

		this.navMeshManager.setAgentSpeed(agentIndex, 2.5);
		this.navMeshManager.setAgentTarget(agentIndex, target);

		entity.setValue(CompanionComponent, "state", CompanionState.Run);
		entity.setValue(CompanionComponent, "hasTarget", true);

		this.playAnimation(entity, "run", true);
	}

	//その場でのジェスチャー
	playGesture(entity: Entity, gestureName: string) {
		const data = this.companionDataMap.get(entity.index);
		if (!data || !data.animations[gestureName]) {
			console.warn(`Gesture ${gestureName} not found`);
			return;
		}

		entity.setValue(CompanionComponent, "state", CompanionState.Gesture);
		entity.setValue(CompanionComponent, "currentGesture", gestureName);

		//1周したらidleに戻る
		this.playAnimation(entity, gestureName, false, () => {
			this.transitionToIdle(entity);
		});
	}
}
