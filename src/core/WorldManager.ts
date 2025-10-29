import { DirectionalLight, SessionMode, World } from "@iwsdk/core";
import { CONFIG } from "../config/constants";

export class WorldManager {
	/**
	 * 新しいWorldインスタンスを作成して設定
	 * @param container シーン用のHTMLコンテナ要素
	 * @returns 設定済みのWorldインスタンス
	 */
	async createWorld(container: HTMLDivElement): Promise<World> {
		const world = await World.create(container, {
			xr: {
				sessionMode: SessionMode.ImmersiveAR,
				offer: "always",
				features: {
					handTracking: true,
					anchors: true,
					hitTest: true,
					planeDetection: true,
					meshDetection: true,
					layers: true,
				},
			},
			features: {
				locomotion: false,
				grabbing: true,
				physics: false,
				sceneUnderstanding: true,
			},
		});

		this.configureCamera(world);
		this.setupLighting(world);

		return world;
	}

	/**
	 * カメラ位置を設定
	 */
	private configureCamera(world: World): void {
		const { x, y, z } = CONFIG.CAMERA_POSITION;
		world.camera.position.set(x, y, z);
	}

	/**
	 * シーンのライティングを設定
	 */
	private setupLighting(world: World): void {
		const { COLOR, INTENSITY, POSITION } = CONFIG.LIGHT;
		const directionalLight = new DirectionalLight(COLOR, INTENSITY);
		directionalLight.position.set(POSITION.x, POSITION.y, POSITION.z);
		world.scene.add(directionalLight);
	}
}
