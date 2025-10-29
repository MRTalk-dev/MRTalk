/**
 * JSON-RPCメッセージの型
 */
export interface JSONRPCMessage {
	method: string;
	params?: unknown;
	id?: string;
}

/**
 * WebSocket接続とメッセージ処理を管理
 */
export class WebSocketClient {
	private ws: WebSocket | null = null;
	private messageCallbacks: ((message: JSONRPCMessage) => void)[] = [];

	constructor(private url: string) {}

	/**
	 * WebSocketサーバーに接続
	 */
	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(this.url);

				this.ws.onopen = () => {
					console.log(`[WebSocket] Connected to ${this.url}`);
					resolve();
				};

				this.ws.onerror = (error) => {
					console.error("[WebSocket] Connection error:", error);
					reject(error);
				};

				this.ws.onclose = () => {
					console.log("[WebSocket] Connection closed");
				};

				this.ws.onmessage = (event) => {
					this.handleMessage(event);
				};
			} catch (error) {
				console.error("[WebSocket] Failed to create connection:", error);
				reject(error);
			}
		});
	}

	/**
	 * WebSocketサーバーから切断
	 */
	disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	/**
	 * サーバーにメッセージを送信
	 * @param message 送信するメッセージオブジェクト
	 */
	send(message: object): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.error("[WebSocket] Cannot send message: connection not open");
			return;
		}

		try {
			this.ws.send(JSON.stringify(message));
		} catch (error) {
			console.error("[WebSocket] Failed to send message:", error);
		}
	}

	/**
	 * 受信メッセージ用のコールバックを登録
	 * @param callback メッセージ受信時に呼び出す関数
	 */
	onMessage(callback: (message: JSONRPCMessage) => void): void {
		this.messageCallbacks.push(callback);
	}

	/**
	 * 受信したWebSocketメッセージを処理
	 */
	private handleMessage(event: MessageEvent): void {
		try {
			const message: JSONRPCMessage = JSON.parse(event.data.toString());
			console.log("[WebSocket] Received:", message);

			// 登録されたすべての callback に通知
			for (const callback of this.messageCallbacks) {
				callback(message);
			}
		} catch (error) {
			console.error("[WebSocket] Failed to parse message:", error);
		}
	}

	/**
	 * WebSocketが接続されているかチェック
	 */
	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}
}
