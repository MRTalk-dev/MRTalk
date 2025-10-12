import { threeToSoloNavMesh } from "@recast-navigation/three";
import { Crowd, type NavMesh } from "recast-navigation";
import * as THREE from "three";

export class NavMeshManager {
	private navMesh: NavMesh | null = null;
	private crowd: Crowd | null = null;
	private ready = false;

	isReady(): boolean {
		return this.ready && this.navMesh !== null && this.crowd !== null;
	}

	bakeNavMesh(meshes: THREE.Mesh[]) {
		if (meshes.length === 0) {
			console.warn("No meshes to bake NavMesh");
			return;
		}

		try {
			const result = threeToSoloNavMesh(meshes, { walkableClimb: 1 });

			if (!result.navMesh) {
				console.error("Failed to generate NavMesh");
				return;
			}

			this.navMesh = result.navMesh;
			this.crowd = new Crowd(result.navMesh, {
				maxAgents: 10,
				maxAgentRadius: 0.3,
			});

			this.ready = true;
			console.log("NavMesh baked successfully");
		} catch (error) {
			console.error("Failed to bake NavMesh:", error);
		}
	}

	addAgent(position: THREE.Vector3): number | null {
		if (!this.crowd || !this.navMesh) {
			console.warn("NavMesh not ready");
			return null;
		}

		const agent = this.crowd.addAgent(
			{
				x: position.x,
				y: position.y,
				z: position.z,
			},
			{ radius: 0.1, maxSpeed: 1 },
		);

		return agent.agentIndex;
	}

	setAgentSpeed(agentIndex: number, maxSpeed: number): void {
		if (!this.crowd) {
			return;
		}

		const agent = this.crowd.getAgent(agentIndex);
		if (!agent) {
			return;
		}

		agent.maxSpeed = maxSpeed;
	}

	setAgentTarget(agentIndex: number, target: THREE.Vector3): boolean {
		if (!this.crowd || !this.navMesh) {
			return false;
		}

		const agent = this.crowd.getAgent(agentIndex);
		if (!agent) {
			return false;
		}

		agent.requestMoveTarget({
			x: target.x,
			y: target.y,
			z: target.z,
		});

		return true;
	}

	getAgentPosition(agentIndex: number): THREE.Vector3 | null {
		if (!this.crowd) {
			return null;
		}

		const agent = this.crowd.getAgent(agentIndex);
		if (!agent) {
			return null;
		}

		const pos = agent.position();
		return new THREE.Vector3(pos.x, pos.y, pos.z);
	}

	getAgentVelocity(agentIndex: number): THREE.Vector3 | null {
		if (!this.crowd) {
			return null;
		}

		const agent = this.crowd.getAgent(agentIndex);
		if (!agent) {
			return null;
		}

		const vel = agent.velocity();
		return new THREE.Vector3(vel.x, vel.y, vel.z);
	}

	update(deltaTime: number) {
		if (this.crowd) {
			this.crowd.update(deltaTime);
		}
	}
}
