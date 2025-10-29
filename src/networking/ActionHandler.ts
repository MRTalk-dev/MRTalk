import * as THREE from "three";
import type { CompanionData } from "../companion/CompanionLoader";
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
		private companionMap: Map<string, CompanionData>,
		private companionSystem: CompanionSystem,
	) {}

	/**
	 * アクションメッセージを処理
	 * @param params アクションパラメータ
	 */
	handleAction(params: ActionParams): void {
		console.log(
			`[ActionHandler] Handling action: ${params.name} from ${params.from}`,
		);

		// fromフィールドからコンパニオンを特定
		const companion = this.companionMap.get(params.from);
		if (!companion) {
			console.warn(
				`[ActionHandler] Companion not found for ID: ${params.from}`,
			);
			return;
		}

		switch (params.name) {
			case "walk":
				this.handleWalk(companion, params.params);
				break;
			case "run":
				this.handleRun(companion, params.params);
				break;
			case "gesture":
				this.handleGesture(companion, params.params);
				break;
			default:
				console.warn(`[ActionHandler] Unknown action: ${params.name}`);
		}
	}

	/**
	 * 歩行アクションを処理
	 */
	private handleWalk(
		companion: CompanionData,
		params: Record<string, unknown>,
	): void {
		if (
			typeof params.x === "number" &&
			typeof params.y === "number" &&
			typeof params.z === "number"
		) {
			const target = new THREE.Vector3(params.x, params.y, params.z);
			this.companionSystem.walkTo(companion.entity, target);
		} else {
			console.error("[ActionHandler] Invalid walk parameters:", params);
		}
	}

	/**
	 * 走行アクションを処理
	 */
	private handleRun(
		companion: CompanionData,
		params: Record<string, unknown>,
	): void {
		if (
			typeof params.x === "number" &&
			typeof params.y === "number" &&
			typeof params.z === "number"
		) {
			const target = new THREE.Vector3(params.x, params.y, params.z);
			this.companionSystem.runTo(companion.entity, target);
		} else {
			console.error("[ActionHandler] Invalid run parameters:", params);
		}
	}

	/**
	 * ジェスチャーアクションを処理
	 */
	private handleGesture(
		companion: CompanionData,
		params: Record<string, unknown>,
	): void {
		if (typeof params.name === "string") {
			this.companionSystem.playGesture(companion.entity, params.name);
		} else {
			console.error("[ActionHandler] Invalid gesture parameters:", params);
		}
	}
}
