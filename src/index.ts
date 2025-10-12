import {
	DirectionalLight,
	SceneUnderstandingSystem,
	SessionMode,
	World,
	XRAnchor,
	XRMesh,
	XRPlane,
} from "@iwsdk/core";
import { Companion } from "../lib/companion/Companion";
import { loadVRM } from "../lib/VRM/loadVRM";
import { MeshProcessSystem } from "./mesh";

World.create(document.getElementById("scene-container") as HTMLDivElement, {
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
}).then(async (world) => {
	const { camera } = world;
	camera.position.set(0, 1, 0.5);
	const directionalLight = new DirectionalLight(0xffffff, 3);
	directionalLight.position.set(5, 5, 5);
	world.scene.add(directionalLight);
	const vrm = await loadVRM("/natsumi.vrm");
	const companion = new Companion(vrm.gltf);
	world.createTransformEntity(vrm.gltf.scene);
	world
		.registerSystem(SceneUnderstandingSystem)
		.registerSystem(MeshProcessSystem)
		.registerComponent(XRPlane)
		.registerComponent(XRMesh)
		.registerComponent(XRAnchor);
	const system = world.getSystem(SceneUnderstandingSystem);
	if (system) {
		system.config.showWireFrame.value = true;
	}
});
