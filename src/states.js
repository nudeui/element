export function appliesTo (Class) {
	return "cssStates" in Class;
}


export function Mixin (Super = HTMLElement, {internalsProp = "_internals"} = {}) {
	return class StatesMixin extends Super {

		// TODO do we also need addState() and removeState() or is toggleState() enough?
		/**
		 * Add or remove a CSS custom state on the element.
		 * @param {string} state - The name of the state to add or remove.
		 * @param {boolean} [force] - If omitted, the state will be toggled. If true, the state will be added. If false, the state will be removed.
		 */
		toggleState (state, force) {
			let states = this[internalsProp].states;

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

		static appliesTo = appliesTo;
	}
};

Mixin.appliesTo = appliesTo;

export default Mixin();
