import { internals } from "../util/symbols.js";


export const members = {
	toggleState (state, force) {
		if (!this[internals]) {
			return;
		}

		if (force === undefined) {
			force = !this[internals].states.has(state);
		}

		this[state] = force;

		return force;
	}
};
