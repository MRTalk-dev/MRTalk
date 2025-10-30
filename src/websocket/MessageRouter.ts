import type { ActionHandler, ActionParams } from "./ActionHandler";
import type { QueryHandler, QueryMessage } from "./QueryHandler";
import type { JSONRPCMessage } from "./WebSocketClient";

/**
 * 受信メッセージを適切なハンドラーにルーティング
 */
export class MessageRouter {
	constructor(
		private actionHandler: ActionHandler,
		private queryHandler: QueryHandler,
	) {}

	/**
	 * メッセージを適切なハンドラーにルーティング
	 * @param message 受信メッセージ
	 */
	async route(message: JSONRPCMessage): Promise<void> {
		console.log(`[MessageRouter] Routing message: ${message.method}`);

		try {
			switch (message.method) {
				case "action.send":
					this.handleActionMessage(message);
					break;
				case "query.send":
					await this.handleQueryMessage(message);
					break;
				default:
					console.warn(`[MessageRouter] Unknown method: ${message.method}`);
			}
		} catch (error) {
			console.error("[MessageRouter] Error routing message:", error);
		}
	}

	/**
	 * action.sendメッセージを処理
	 */
	private handleActionMessage(message: JSONRPCMessage): void {
		if (this.isActionMessage(message.params)) {
			this.actionHandler.handleAction(message.params);
		} else {
			console.error("[MessageRouter] Invalid action message params:", message);
		}
	}

	/**
	 * query.sendメッセージを処理
	 */
	private async handleQueryMessage(message: JSONRPCMessage): Promise<void> {
		if (this.isQueryMessage(message)) {
			await this.queryHandler.handleQuery({
				id: message.id || "",
				params: message.params as QueryMessage["params"],
			});
		} else {
			console.error("[MessageRouter] Invalid query message:", message);
		}
	}

	/**
	 * アクションメッセージの型ガード
	 */
	private isActionMessage(params: unknown): params is ActionParams {
		return (
			typeof params === "object" &&
			params !== null &&
			"name" in params &&
			"params" in params &&
			"from" in params
		);
	}

	/**
	 * クエリメッセージの型ガード
	 */
	private isQueryMessage(message: JSONRPCMessage): boolean {
		return (
			typeof message.id === "string" &&
			typeof message.params === "object" &&
			message.params !== null &&
			"type" in message.params
		);
	}
}
