import type { Entity } from "@iwsdk/core";
import { CompanionComponent, CompanionState } from "./CompanionComponent";

/**
 * State manager for companion entities
 * Handles state transitions and component value updates
 */
export class CompanionStateManager {
	/**
	 * Transition to Idle state
	 * @param entity - The companion entity
	 */
	transitionToIdle(entity: Entity): void {
		entity.setValue(CompanionComponent, "state", CompanionState.Idle);
		entity.setValue(CompanionComponent, "hasTarget", false);
	}

	/**
	 * Transition to Walk state
	 * @param entity - The companion entity
	 * @param target - Target position (not stored, managed by NavMesh)
	 */
	transitionToWalk(entity: Entity): void {
		entity.setValue(CompanionComponent, "state", CompanionState.Walk);
		entity.setValue(CompanionComponent, "hasTarget", true);
	}

	/**
	 * Transition to Run state
	 * @param entity - The companion entity
	 * @param target - Target position (not stored, managed by NavMesh)
	 */
	transitionToRun(entity: Entity): void {
		entity.setValue(CompanionComponent, "state", CompanionState.Run);
		entity.setValue(CompanionComponent, "hasTarget", true);
	}

	/**
	 * Transition to Gesture state
	 * @param entity - The companion entity
	 * @param gestureName - Name of gesture to perform
	 */
	transitionToGesture(entity: Entity, gestureName: string): void {
		entity.setValue(CompanionComponent, "state", CompanionState.Gesture);
		entity.setValue(CompanionComponent, "currentGesture", gestureName);
	}

	/**
	 * Get current state of companion
	 * @param entity - The companion entity
	 * @returns Current CompanionState
	 */
	getCurrentState(entity: Entity): CompanionState {
		return entity.getValue(CompanionComponent, "state") as CompanionState;
	}

	/**
	 * Check if companion has a movement target
	 * @param entity - The companion entity
	 * @returns True if has target
	 */
	hasTarget(entity: Entity): boolean {
		return entity.getValue(CompanionComponent, "hasTarget") as boolean;
	}

	/**
	 * Get agent index for NavMesh
	 * @param entity - The companion entity
	 * @returns Agent index or null
	 */
	getAgentIndex(entity: Entity): number | null {
		const index = entity.getValue(CompanionComponent, "agentIndex") as number;
		return index >= 0 ? index : null;
	}
}
