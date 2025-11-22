import { satisfiedBy, internals } from "./util/get-symbols.js";

export const Mixin = (Super = HTMLElement) => class StatesMixin extends Super {
	// TODO do we also need addState() and removeState() or is toggleState() enough?
	/**
	 * Add or remove a CSS custom state on the element.
	 * @param {string} state - The name of the state to add or remove.
	 * @param {boolean} [force] - If omitted, the state will be toggled. If true, the state will be added. If false, the state will be removed.
	 */
	toggleState (state, force) {
		let states = this[internals].states;

		if (!states) {
			// TODO rewrite to attributes if states not supported? Possibly as a separate mixin
			return;
		}

		force ??= !states.has(state);

		if (force) {
			states.add(state);
		}
		else {
			states.delete(state);
		}
	}

	attachInternals () {
		return this[internals] ??= super.attachInternals?.();
	}

	static [satisfiedBy] = "cssStates";
};

export default Mixin();
