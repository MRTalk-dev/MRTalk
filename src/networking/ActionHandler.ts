import type { Entity } from "@iwsdk/core";
import * as THREE from "three";
import type { CompanionSystem } from "../companion/CompanionSystem";

/**
 * アクションメッセージのパラメータ
 */
export interface ActionParams {
	name: string;
	params: Record<string, unknown>;
	from: string;
}

/**
 * ネットワークからの"action.send"メッセージを処理
 */
export class ActionHandler {
	constructor(
		private companionEntity: Entity,
		private companionSystem: CompanionSystem,
	) {}

	/**
	 * アクションメッセージを処理
	 * @param params アクションパラメータ
	 */
	handleAction(params: ActionParams): void {
		console.log(`[ActionHandler] Handling action: ${params.name}`);

		switch (params.name) {
			case "walk":
				this.handleWalk(params.params);
				break;
			case "run":
				this.handleRun(params.params);
				break;
			case "gesture":
				this.handleGesture(params.params);
				break;
			default:
				console.warn(`[ActionHandler] Unknown action: ${params.name}`);
		}
	}

	/**
	 * 歩行アクションを処理
	 */
	private handleWalk(params: Record<string, unknown>): void {
		if (
			typeof params.x === "number" &&
			typeof params.y === "number" &&
			typeof params.z === "number"
		) {
			const target = new THREE.Vector3(params.x, params.y, params.z);
			this.companionSystem.walkTo(this.companionEntity, target);
		} else {
			console.error("[ActionHandler] Invalid walk parameters:", params);
		}
	}

	/**
	 * 走行アクションを処理
	 */
	private handleRun(params: Record<string, unknown>): void {
		if (
			typeof params.x === "number" &&
			typeof params.y === "number" &&
			typeof params.z === "number"
		) {
			const target = new THREE.Vector3(params.x, params.y, params.z);
			this.companionSystem.runTo(this.companionEntity, target);
		} else {
			console.error("[ActionHandler] Invalid run parameters:", params);
		}
	}

	/**
	 * ジェスチャーアクションを処理
	 */
	private handleGesture(params: Record<string, unknown>): void {
		if (typeof params.name === "string") {
			this.companionSystem.playGesture(this.companionEntity, params.name);
		} else {
			console.error("[ActionHandler] Invalid gesture parameters:", params);
		}
	}
}
