import { type AnimationClip, type AnimationMixer, Clock } from "@iwsdk/core";

export type Animations =
	| "dance"
	| "idle"
	| "jump"
	| "look"
	| "nod"
	| "stretch"
	| "walk"
	| "wave";

export class AnimationManager {
	private animations: Map<Animations, AnimationClip>;
	private mixer: AnimationMixer;
	private clock: Clock;

	constructor(
		animations: Map<Animations, AnimationClip>,
		mixer: AnimationMixer,
	) {
		this.animations = animations;
		this.mixer = mixer;
		this.clock = new Clock();
	}

	play(name: Animations) {
		const anim = this.animations.get(name);
		if (!anim) return;
		const clip = this.mixer.clipAction(anim);
		clip.play();
	}

	stop(name: Animations) {
		const anim = this.animations.get(name);
		if (!anim) return;
		const clip = this.mixer.clipAction(anim);
		clip.stop();
	}

	stopAll() {
		this.mixer.stopAllAction();
	}

	update() {
		const delta = this.clock.getDelta();
		this.mixer.update(delta);
	}
}
