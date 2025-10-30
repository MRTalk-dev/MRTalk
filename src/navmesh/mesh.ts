import { createSystem, XRMesh } from "@iwsdk/core";
import type { Crowd, NavMesh } from "recast-navigation";
import * as THREE from "three";
import { NavMeshManager } from "./NavMeshManager";

export class MeshProcessSystem extends createSystem({
	meshEntities: { required: [XRMesh] },
}) {
	onBaked: (navMesh: NavMesh, crowd: Crowd) => void = () => {};
	private navMeshManager!: NavMeshManager;
	private globalMeshes: THREE.Mesh[] = [];
	private furnitureEntities: Array<{
		label: string;
		position: THREE.Vector3;
	}> = [];

	init() {
		this.navMeshManager = new NavMeshManager();
		this.queries.meshEntities.subscribe("qualify", (entity) => {
			const isBounded = entity.getValue(XRMesh, "isBounded3D");
			const semanticLabel = entity.getValue(XRMesh, "semanticLabel");
			if (isBounded && semanticLabel && entity.object3D) {
				console.log("家具", entity);
				this.furnitureEntities.push({
					label: semanticLabel,
					position: entity.object3D.position,
				});
			} else if (!isBounded || !semanticLabel) {
				console.log("Global Mesh", entity);
				const mesh = entity.object3D as THREE.Mesh;
				if (mesh instanceof THREE.Mesh) {
					this.globalMeshes.push(mesh);
					this.bakeNavMesh();
				}
			}
		});
	}

	private bakeNavMesh() {
		if (this.globalMeshes.length > 0) {
			console.log(
				`Baking NavMesh from ${this.globalMeshes.length} global meshes`,
			);
			const result = this.navMeshManager.bakeNavMesh(this.globalMeshes);
			console.log(result);
			if (result) this.onBaked(result.navMesh, result.crowd);
		}
	}

	getFurniture(): Array<{
		label: string;
		position: { x: number; y: number; z: number };
	}> {
		return this.furnitureEntities.map((furniture) => ({
			label: furniture.label,
			position: {
				x: furniture.position.x,
				y: furniture.position.y,
				z: furniture.position.z,
			},
		}));
	}

	update(delta: number) {
		this.navMeshManager.update(delta);
	}
}
