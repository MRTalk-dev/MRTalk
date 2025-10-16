import type { Query } from "@aikyo/server";
import { createCompanionAction, createCompanionKnowledge } from "@aikyo/utils";
import { z } from "zod";

export const speakTool = createCompanionAction({
	id: "speak",
	description: "発言する。",
	inputSchema: z.object({
		message: z.string(),
		to: z
			.array(
				z.string().refine((val) => val.startsWith("companion_"), {
					message: "String must start with 'companion_'",
				}),
			)
			.describe(
				"このメッセージの宛先。必ずcompanion_から始まるコンパニオンidを指定してください。特定のコンパニオンに個人的に話しかけたいとき以外は、必ず、会話に参加したことのある他のコンパニオンのidを含むようにしてください。",
			),
		emotion: z.enum(["happy", "sad", "angry", "neutral"]),
	}),
	topic: "messages",
	publish: async ({ input, id, sendQuery }) => {
		const queryId = crypto.randomUUID();
		const query: Query = {
			jsonrpc: "2.0",
			id: queryId,
			method: "query.send",
			params: {
				from: id,
				type: "speak",
				body: { message: input.message, emotion: input.emotion },
			},
		};
		const res = await sendQuery(query, 100000);
		console.log(res);
		return {
			jsonrpc: "2.0",
			method: "message.send",
			params: {
				id: crypto.randomUUID(),
				from: id,
				to: input.to,
				message: input.message,
				metadata: { emotion: input.emotion },
			},
		};
	},
});

export const gestureAction = createCompanionAction({
	id: "gesture",
	description: "ジェスチャーを表現します。",
	inputSchema: z.object({
		name: z.enum([
			"idle",
			"walk",
			"run",
			"wave",
			"nod",
			"dance",
			"jump",
			"look",
			"stretch",
		]),
	}),
	topic: "actions",
	publish: ({ input, id }) => {
		return {
			jsonrpc: "2.0",
			method: "action.send",
			params: {
				name: "gesture",
				from: id,
				params: { name: input.name },
			},
		};
	},
});

export const walkAction = createCompanionAction({
	id: "walk",
	description: "指定した座標へ歩きます。",
	inputSchema: z.object({
		x: z.number(),
		y: z.number(),
		z: z.number(),
	}),
	topic: "actions",
	publish: ({ input, id }) => {
		return {
			jsonrpc: "2.0",
			method: "action.send",
			params: {
				name: "walk",
				from: id,
				params: { x: input.x, y: input.y, z: input.z },
			},
		};
	},
});

export const runAction = createCompanionAction({
	id: "run",
	description: "指定した座標へ駆け寄ります。",
	inputSchema: z.object({
		x: z.number(),
		y: z.number(),
		z: z.number(),
	}),
	topic: "actions",
	publish: ({ input, id }) => {
		return {
			jsonrpc: "2.0",
			method: "action.send",
			params: {
				name: "run",
				from: id,
				params: { x: input.x, y: input.y, z: input.z },
			},
		};
	},
});

export const objectKnowledge = createCompanionKnowledge({
	id: "objects-knowledge",
	description: "部屋の中にあるものの座標を取得します。",
	inputSchema: z.object({}),
	outputSchema: z.string(),
	knowledge: async ({ id, sendQuery }) => {
		const query: Query = {
			jsonrpc: "2.0",
			id: crypto.randomUUID(),
			method: "query.send",
			params: {
				from: id,
				type: "objects",
			},
		};
		const res = await sendQuery(query);
		if (res.result) {
			return JSON.stringify(res.result.body.list, null, 2);
		} else {
			return "家具情報の取得に失敗しました。";
		}
	},
});

export const userKnowledge = createCompanionKnowledge({
	id: "user-knowledge",
	description: "ユーザーのいる座標を取得します。",
	inputSchema: z.object({}),
	outputSchema: z.string(),
	knowledge: async ({ id, sendQuery }) => {
		const query: Query = {
			jsonrpc: "2.0",
			id: crypto.randomUUID(),
			method: "query.send",
			params: {
				from: id,
				type: "user",
			},
		};
		const res = await sendQuery(query);
		if (res.result) {
			return JSON.stringify(res.result.body, null, 2);
		} else {
			return "ユーザーの位置取得に失敗しました。";
		}
	},
});
