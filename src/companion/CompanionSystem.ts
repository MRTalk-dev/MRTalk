import { createSystem } from "@iwsdk/core";
import type { Companion } from "./Companion";

export class CompanionSystem extends createSystem() {
	private companionsMap: Map<string, Companion> | null = null;

	setCompanions(companions: Map<string, Companion>): void {
		this.companionsMap = companions;
	}

	update(delta: number): void {
		if (!this.companionsMap) return;

		// 全てのCompanionのupdateを呼び出す
		for (const companion of this.companionsMap.values()) {
			companion.update(delta);
		}
	}
}
