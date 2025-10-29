import * as THREE from "three";

export class AnimationController {
	/**
	 * crossfade サポート付きで animation を再生
	 * @param mixer - THREE.AnimationMixer instance
	 * @param animations - 利用可能な animation clip の Record
	 * @param currentAction - 現在再生中の action(fade out 用)
	 * @param animationName - 再生する animation 名
	 * @param loop - animation をループするかどうか
	 * @param onFinished - 非ループ animation の callback
	 * @returns 開始された新しい AnimationAction
	 */
	playAnimation(
		mixer: THREE.AnimationMixer,
		animations: Record<string, THREE.AnimationClip>,
		currentAction: THREE.AnimationAction | null,
		animationName: string,
		loop: boolean,
		onFinished?: () => void,
	): THREE.AnimationAction | null {
		// animation が存在するか確認
		if (!animations[animationName]) {
			console.warn(`Animation ${animationName} not found`);
			return null;
		}

		const newClip = animations[animationName];
		const newAction = mixer.clipAction(newClip);

		// 現在の action を fade out
		if (currentAction && currentAction !== newAction) {
			currentAction.fadeOut(0.3);
		}

		// crossfade 付きで新しい action をセットアップ
		newAction.reset();
		newAction.fadeIn(0.3);
		newAction.setLoop(
			loop ? THREE.LoopRepeat : THREE.LoopOnce,
			loop ? Infinity : 1,
		);
		newAction.clampWhenFinished = true;
		newAction.play();

		// 非ループ animation の finished event を処理
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
