/**
 * Provide access to element internals through a symbol property
 */

import { defineLazyProperty, symbols, getSuper } from "../plugins/index.js";

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
		if (getOwnValue(this, internals)) {
			return this[internals];
		}

		const _attachInternals = getSuper(this)?.attachInternals ?? HTMLElement.prototype.attachInternals;

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
