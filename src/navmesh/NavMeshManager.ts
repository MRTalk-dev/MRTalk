import { threeToSoloNavMesh } from "@recast-navigation/three";
import { Crowd, type NavMesh } from "recast-navigation";
import * as THREE from "three";

export class NavMeshAgent {
	private crowd: Crowd;
	private agentIndex: number;

	constructor(crowd: Crowd, position: THREE.Vector3) {
		this.crowd = crowd;
		const agent = this.crowd.addAgent(
			{
				x: position.x,
				y: position.y,
				z: position.z,
			},
			{ radius: 0.1, maxSpeed: 1 },
		);
		this.agentIndex = agent.agentIndex;
	}

	get index() {
		return this.agentIndex;
	}

	setSpeed(maxSpeed: number): void {
		const agent = this.crowd.getAgent(this.agentIndex);
		if (!agent) {
			return;
		}

		agent.maxSpeed = maxSpeed;
	}

	setTarget(target: THREE.Vector3): boolean {
		const agent = this.crowd.getAgent(this.agentIndex);
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

	getPosition(): THREE.Vector3 | null {
		const agent = this.crowd.getAgent(this.agentIndex);
		if (!agent) {
			return null;
		}

		const pos = agent.position();
		return new THREE.Vector3(pos.x, pos.y, pos.z);
	}

	getVelocity(): THREE.Vector3 | null {
		const agent = this.crowd.getAgent(this.agentIndex);
		if (!agent) {
			return null;
		}

		const vel = agent.velocity();
		return new THREE.Vector3(vel.x, vel.y, vel.z);
	}
}

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

	getCrowd(): Crowd | null {
		return this.crowd;
	}

	update(deltaTime: number) {
		if (this.crowd) {
			this.crowd.update(deltaTime);
		}
	}
}
