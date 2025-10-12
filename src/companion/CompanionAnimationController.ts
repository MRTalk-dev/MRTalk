import * as THREE from "three";

/**
 * Animation controller for VRM characters
 * Handles animation playback, crossfading, and event management
 */
export class CompanionAnimationController {
	/**
	 * Play an animation with crossfade support
	 * @param mixer - THREE.AnimationMixer instance
	 * @param animations - Record of available animation clips
	 * @param currentAction - Currently playing action (for fade out)
	 * @param animationName - Name of animation to play
	 * @param loop - Whether to loop the animation
	 * @param onFinished - Callback for non-looping animations
	 * @returns The new AnimationAction that was started
	 */
	playAnimation(
		mixer: THREE.AnimationMixer,
		animations: Record<string, THREE.AnimationClip>,
		currentAction: THREE.AnimationAction | null,
		animationName: string,
		loop: boolean,
		onFinished?: () => void,
	): THREE.AnimationAction | null {
		// Check if animation exists
		if (!animations[animationName]) {
			console.warn(`Animation ${animationName} not found`);
			return null;
		}

		const newClip = animations[animationName];
		const newAction = mixer.clipAction(newClip);

		// Fade out current action
		if (currentAction && currentAction !== newAction) {
			currentAction.fadeOut(0.3);
		}

		// Setup new action with crossfade
		newAction.reset();
		newAction.fadeIn(0.3);
		newAction.setLoop(
			loop ? THREE.LoopRepeat : THREE.LoopOnce,
			loop ? Infinity : 1,
		);
		newAction.clampWhenFinished = true;
		newAction.play();

		// Handle finished event for non-looping animations
		if (!loop && onFinished) {
			const onFinishedHandler = (e: { action: THREE.AnimationAction }) => {
				if (e.action === newAction) {
					mixer.removeEventListener("finished", onFinishedHandler);
					onFinished();
				}
			};
			mixer.addEventListener("finished", onFinishedHandler);
		}

		return newAction;
	}
}
