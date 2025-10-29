import * as THREE from "three";

export class MovementController {
	private static readonly ARRIVAL_SPEED_THRESHOLD = 0.1;
	private static readonly ROTATION_LERP_FACTOR = 0.1;

	/**
	 * VRM の位置を NavMesh agent の位置に合わせて更新
	 * @param vrmScene - VRM scene object
	 * @param agentPos - NavMesh agent からの位置
	 */
	updatePosition(vrmScene: THREE.Object3D, agentPos: THREE.Vector3): void {
		vrmScene.position.copy(agentPos);
	}

	/**
	 * VRM の回転を移動方向に向けて更新
	 * @param vrmScene - VRM scene object
	 * @param velocity - 移動速度 vector
	 */
	updateRotation(vrmScene: THREE.Object3D, velocity: THREE.Vector3): void {
		const lookDirection = velocity.clone().normalize();

		if (lookDirection.lengthSq() > 0) {
			// world space での target point を計算
			const targetPoint = new THREE.Vector3().addVectors(
				vrmScene.position,
				lookDirection,
			);

			// Object3D.lookAt で正しい回転を使用
			const currentRotation = vrmScene.quaternion.clone();
			vrmScene.lookAt(targetPoint);
			const targetRotation = vrmScene.quaternion.clone();

			// 現在の回転から target 回転へ滑らかに補間
			vrmScene.quaternion.copy(currentRotation);
			vrmScene.quaternion.slerp(
				targetRotation,
				MovementController.ROTATION_LERP_FACTOR,
			);
		}
	}

	/**
	 * キャラクターが目的地に到着したか確認
	 * @param velocity - 現在の移動速度
	 * @returns 速度が閾値を下回る場合 true(到着)
	 */
	checkArrival(velocity: THREE.Vector3): boolean {
		const speed = velocity.length();
		return speed < MovementController.ARRIVAL_SPEED_THRESHOLD;
	}
}
