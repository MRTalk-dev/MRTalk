import { createSystem, XRMesh } from "@iwsdk/core";

export class MeshProcessSystem extends createSystem({
	meshEntities: { required: [XRMesh] },
}) {
	init() {
		this.queries.meshEntities.subscribe("qualify", (entity) => {
			const isBounded = entity.getValue(XRMesh, "isBounded3D");
			const semanticLabel = entity.getValue(XRMesh, "semanticLabel");

			if (isBounded && semanticLabel) {
				console.log("家具", entity);
			} else {
				console.log("Global Mesh", entity);
			}
		});
	}
}
