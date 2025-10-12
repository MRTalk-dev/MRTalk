import { createComponent, Types } from "@iwsdk/core";

export enum CompanionState {
	Idle = "idle",
	Walk = "walk",
	Run = "run",
	Gesture = "gesture",
}

export const CompanionComponent = createComponent("CompanionComponent", {
	state: { type: Types.String, default: CompanionState.Idle },
	hasTarget: { type: Types.Boolean, default: false },
	currentGesture: { type: Types.String, default: "" },
	agentIndex: { type: Types.Float64, default: -1 },
});
