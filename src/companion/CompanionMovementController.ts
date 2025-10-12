import * as THREE from "three";

/**
 * Movement controller for VRM characters
 * Handles position synchronization and rotation towards movement direction
 */
export class CompanionMovementController {
	private static readonly ARRIVAL_SPEED_THRESHOLD = 0.1;
	private static readonly ROTATION_LERP_FACTOR = 0.1;

	/**
	 * Update VRM position to match NavMesh agent position
	 * @param vrmScene - The VRM scene object
	 * @param agentPos - Position from NavMesh agent
	 */
	updatePosition(vrmScene: THREE.Object3D, agentPos: THREE.Vector3): void {
		vrmScene.position.copy(agentPos);
	}

	/**
	 * Update VRM rotation to face movement direction
	 * @param vrmScene - The VRM scene object
	 * @param velocity - Movement velocity vector
	 */
	updateRotation(vrmScene: THREE.Object3D, velocity: THREE.Vector3): void {
		const lookDirection = velocity.clone().normalize();

		if (lookDirection.lengthSq() > 0) {
			// Calculate target point in world space
			const targetPoint = new THREE.Vector3().addVectors(
				vrmScene.position,
				lookDirection,
			);

			// Use Object3D.lookAt for correct rotation
			const currentRotation = vrmScene.quaternion.clone();
			vrmScene.lookAt(targetPoint);
			const targetRotation = vrmScene.quaternion.clone();

			// Smoothly interpolate from current to target rotation
			vrmScene.quaternion.copy(currentRotation);
			vrmScene.quaternion.slerp(
				targetRotation,
				CompanionMovementController.ROTATION_LERP_FACTOR,
			);
		}
	}

	/**
	 * Check if character has arrived at destination
	 * @param velocity - Current movement velocity
	 * @returns True if speed is below threshold (arrived)
	 */
	checkArrival(velocity: THREE.Vector3): boolean {
		const speed = velocity.length();
		return speed < CompanionMovementController.ARRIVAL_SPEED_THRESHOLD;
	}
}
