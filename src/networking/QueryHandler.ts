import type { World } from "@iwsdk/core";
import type { VoiceVoxClient } from "../audio/VoiceVoxClient";
import type { MeshProcessSystem } from "../mesh";
import type { WebSocketClient } from "./WebSocketClient";

/**
 * クエリメッセージの構造
 */
export interface QueryMessage {
	id: string;
	params: {
		type: string;
		from: string;
		body: Record<string, unknown>;
	};
}

/**
 * クエリ結果の構造
 */
export type QueryResult =
	| { success: boolean; body: Record<string, unknown> }
	| { success: boolean; error: string };

/**
 * ネットワークからの"query.send"メッセージを処理
 */
export class QueryHandler {
	constructor(
		private world: World,
		private meshProcessSystem: MeshProcessSystem | undefined,
		private voiceClientMap: Map<string, VoiceVoxClient>,
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

		// fromフィールドから該当するVoiceVoxClientを取得
		const voiceClient = this.voiceClientMap.get(from);
		if (!voiceClient) {
			return {
				success: false,
				error: `VoiceVoxClient not found for companion: ${from}`,
			};
		}

		const emotion = typeof body.emotion === "string" ? body.emotion : undefined;
		await voiceClient.speak(body.message, emotion);

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
