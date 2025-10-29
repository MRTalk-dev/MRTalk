import * as THREE from "three";
import type { Companion } from "../companion/Companion";

export interface ActionParams {
	name: string;
	params: Record<string, unknown>;
	from: string;
}

export class ActionHandler {
	constructor(private companionMap: Map<string, Companion>) {}

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
		companion: Companion,
		params: Record<string, unknown>,
	): void {
		if (
			typeof params.x === "number" &&
			typeof params.y === "number" &&
			typeof params.z === "number"
		) {
			const target = new THREE.Vector3(params.x, params.y, params.z);
			companion.walkTo(target);
		} else {
			console.error("[ActionHandler] Invalid walk parameters:", params);
		}
	}

	/**
	 * 走行アクションを処理
	 */
	private handleRun(
		companion: Companion,
		params: Record<string, unknown>,
	): void {
		if (
			typeof params.x === "number" &&
			typeof params.y === "number" &&
			typeof params.z === "number"
		) {
			const target = new THREE.Vector3(params.x, params.y, params.z);
			companion.runTo(target);
		} else {
			console.error("[ActionHandler] Invalid run parameters:", params);
		}
	}

	/**
	 * ジェスチャーアクションを処理
	 */
	private handleGesture(
		companion: Companion,
		params: Record<string, unknown>,
	): void {
		if (typeof params.name === "string") {
			companion.playGesture(params.name);
		} else {
			console.error("[ActionHandler] Invalid gesture parameters:", params);
		}
	}
}
