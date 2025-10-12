import { type AnimationClip, AnimationMixer } from "@iwsdk/core";
import type { VRM } from "@pixiv/three-vrm";
import type { GLTF } from "three/examples/jsm/Addons.js";
import { loadMixamoAnimation } from "../mixamo/loadMixamoAnimation";
import { AnimationManager, type Animations } from "./AnimationManager";
import { StateManager } from "./State";

export class Companion {
	private VRM: VRM;
	private anim: AnimationManager;
	private state: StateManager;

	constructor(gltf: GLTF) {
		this.VRM = gltf.userData.vrm;
		this.state = new StateManager();
		const keys = [
			"dance",
			"idle",
			"jump",
			"look",
			"nod",
			"stretch",
			"walk",
			"wave",
		] as const;
		const animations = new Map<Animations, AnimationClip>();
		keys.forEach(async (name) => {
			const clip = await loadMixamoAnimation(
				`/animations/${name}.fbx`,
				this.VRM,
			);
			if (!clip) return;
			animations.set(name, clip);
		});
		const mixer = new AnimationMixer(gltf.scene);
		this.anim = new AnimationManager(animations, mixer);
	}
}
