import symbols from "../plugins/symbols.js";
import internalsPlugin from "../internals/base.js";

const { internals } = symbols.known;

export const dependencies = [internalsPlugin];

export const provides = {
	toggleState (state, force) {
		if (!this[internals]) {
			return;
		}

		if (force === undefined) {
			force = !this[internals].states.has(state);
		}

		this[internals].states[force ? "add" : "delete"](state);

		return force;
	},
};

export default { dependencies, provides };
