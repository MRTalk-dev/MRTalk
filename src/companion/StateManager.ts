import type { Entity } from "@iwsdk/core";
import { CompanionComponent, CompanionState } from "./CompanionComponent";

export class StateManager {
	/**
	 * Idle state へ遷移
	 * @param entity - companion entity
	 */
	transitionToIdle(entity: Entity): void {
		entity.setValue(CompanionComponent, "state", CompanionState.Idle);
		entity.setValue(CompanionComponent, "hasTarget", false);
	}

	/**
	 * Walk state へ遷移
	 * @param entity - companion entity
	 */
	transitionToWalk(entity: Entity): void {
		entity.setValue(CompanionComponent, "state", CompanionState.Walk);
		entity.setValue(CompanionComponent, "hasTarget", true);
	}

	/**
	 * Run state へ遷移
	 * @param entity - companion entity
	 */
	transitionToRun(entity: Entity): void {
		entity.setValue(CompanionComponent, "state", CompanionState.Run);
		entity.setValue(CompanionComponent, "hasTarget", true);
	}

	/**
	 * Gesture state へ遷移
	 * @param entity - companion entity
	 * @param gestureName - 実行する gesture 名
	 */
	transitionToGesture(entity: Entity, gestureName: string): void {
		entity.setValue(CompanionComponent, "state", CompanionState.Gesture);
		entity.setValue(CompanionComponent, "currentGesture", gestureName);
	}

	/**
	 * companion の現在の state を取得
	 * @param entity - companion entity
	 * @returns 現在の CompanionState
	 */
	getCurrentState(entity: Entity): CompanionState {
		return entity.getValue(CompanionComponent, "state") as CompanionState;
	}

	/**
	 * companion が移動 target を持っているか確認
	 * @param entity - companion entity
	 * @returns target を持っている場合 true
	 */
	hasTarget(entity: Entity): boolean {
		return entity.getValue(CompanionComponent, "hasTarget") as boolean;
	}
}
