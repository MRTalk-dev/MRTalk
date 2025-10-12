import { createSystem, XRMesh } from "@iwsdk/core";
import * as THREE from "three";
import { NavMeshManager } from "./navmesh/NavMeshManager";

export class MeshProcessSystem extends createSystem({
	meshEntities: { required: [XRMesh] },
}) {
	private navMeshManager!: NavMeshManager;
	private globalMeshes: THREE.Mesh[] = [];

	init() {
		this.navMeshManager = new NavMeshManager();

		this.queries.meshEntities.subscribe("qualify", (entity) => {
			const isBounded = entity.getValue(XRMesh, "isBounded3D");
			const semanticLabel = entity.getValue(XRMesh, "semanticLabel");

			if (isBounded && semanticLabel) {
				console.log("家具", entity);
			} else {
				console.log("Global Mesh", entity);
				const mesh = entity.object3D as THREE.Mesh;
				if (mesh instanceof THREE.Mesh) {
					this.globalMeshes.push(mesh);
					this.bakeNavMesh();
				}
			}
		});
	}

	private async bakeNavMesh() {
		if (this.globalMeshes.length > 0) {
			console.log(
				`Baking NavMesh from ${this.globalMeshes.length} global meshes`,
			);
			await this.navMeshManager.bakeNavMesh(this.globalMeshes);
		}
	}

	getNavMeshManager(): NavMeshManager {
		return this.navMeshManager;
	}
}
