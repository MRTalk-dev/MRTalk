import type { World } from "@iwsdk/core";
import type { VOICEVOXClient } from "../audio/VOICEVOXClient";
import type { Companion } from "../companion/Companion";
import type { MeshProcessSystem } from "../navmesh/mesh";
import type { WebSocketClient } from "./WebSocketClient";

export interface QueryMessage {
	id: string;
	params: {
		type: string;
		from: string;
		body: Record<string, unknown>;
	};
}

export type QueryResult =
	| { success: boolean; body: Record<string, unknown> }
	| { success: boolean; error: string };

export class QueryHandler {
	constructor(
		private world: World,
		private companions: Map<string, Companion>,
		private voicevox: VOICEVOXClient,
		private meshProcessSystem: MeshProcessSystem | undefined,
		private ws: WebSocketClient,
	) {}

	/**
	 * クエリメッセージを処理
	 * @param query クエリメッセージ
	 */
	async handleQuery(query: QueryMessage): Promise<void> {
		console.log(
			`[QueryHandler] Handling query type: ${query.params.type} from ${query.params.from}`,
		);

		let result: QueryResult;

		try {
			switch (query.params.type) {
				case "speak":
					result = await this.handleSpeak(query.params.body, query.params.from);
					break;
				case "objects":
					result = this.handleObjects();
					break;
				case "user":
					result = this.handleUserPosition();
					break;
				default:
					result = {
						success: false,
						body: { error: "Unknown query type" },
					};
			}
		} catch (error) {
			console.error("[QueryHandler] Error handling query:", error);
			result = {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}

		this.sendResponse(query.id, result);
	}

	/**
	 * 発話クエリを処理
	 */
	private async handleSpeak(
		body: Record<string, unknown>,
		from: string,
	): Promise<QueryResult> {
		if (typeof body.message !== "string") {
			return {
				success: false,
				error: "messageが不正です。",
			};
		}
		const emotion = typeof body.emotion === "string" ? body.emotion : undefined;
		const companion = this.companions.get(from);
		if (!companion) {
			return {
				success: false,
				error: "そのコンパニオンは登録されていません。",
			};
		}
		if (emotion) companion.setExpression(emotion);
		await this.voicevox.speak(body.message, companion.config.speakerId);
		return {
			success: true,
			body: { success: true },
		};
	}

	/**
	 * オブジェクトクエリを処理(家具リストを取得)
	 */
	private handleObjects(): QueryResult {
		const objects = this.meshProcessSystem
			? this.meshProcessSystem.getFurniture()
			: [];

		return {
			success: true,
			body: { list: objects },
		};
	}

	/**
	 * ユーザー位置クエリを処理
	 */
	private handleUserPosition(): QueryResult {
		const position = this.world.camera.position;
		return {
			success: true,
			body: { x: position.x, y: position.y, z: position.z },
		};
	}

	/**
	 * クエリレスポンスをサーバーに送信
	 */
	private sendResponse(queryId: string, result: QueryResult): void {
		const response = {
			topic: "queries",
			body: {
				jsonrpc: "2.0",
				id: queryId,
				result,
			},
		};

		console.log("[QueryHandler] Sending response:", response);
		this.ws.send(response);
	}
}
