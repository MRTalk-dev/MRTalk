export type State = "idle" | "walk" | "gesture";

export class StateManager {
	private state: State = "idle";

	setState(state: State) {
		this.state = state;
	}

	getState() {
		return this.state;
	}
}
