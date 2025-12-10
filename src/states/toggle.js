import { internals } from "../util/symbols.js";

import internalsPlugin from "../internals/base.js";

export const dependencies = [internalsPlugin];

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

export default {dependencies, members};
