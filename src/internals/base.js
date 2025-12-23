/**
 * Provide access to element internals through a symbol property
 */

import { defineLazyProperty, symbols, getSuperMember } from "../plugins/index.js";

const { internals } = symbols.known;

/**
 * Get the own value of a property (if one exists) without triggering any getters
 * @param {object} object
 * @param {string} name
 * @returns {any}
 */
function getOwnValue (object, name) {
	let descriptor = Object.getOwnPropertyDescriptor(object, name);
	return descriptor?.value;
}

export const provides = {
	attachInternals () {
		let existing = getOwnValue(this, internals);
		if (existing !== undefined) {
			return existing;
		}

		// If the plugin is installed on a superclass, super.attachInternals will be the same function
		// We want the attachInternals that sits above it
		const _attachInternals = getSuperMember(this, "attachInternals")?.value;

		if (_attachInternals === undefined) {
			// Not supported
			return this[internals] = null;
		}

		try {
			return this[internals] = _attachInternals.call(this);
		}
		catch (error) {
			return this[internals] = null;
		}
	},
};

defineLazyProperty(provides, internals, {
	get () {
		return this.attachInternals();
	},
	configurable: true,
	writable: true,
});

export default {provides};
