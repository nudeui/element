/**
 * Provide access to element internals through a symbol property
 */

import symbols from "../util/symbols.js";
import { defineLazyProperty } from "../util/lazy.js";

const { internals } = symbols.known;
const _attachInternals = HTMLElement.prototype.attachInternals;

export const provides = {
	attachInternals () {
		let descriptor = Object.getOwnPropertyDescriptor(this, internals);
		if (descriptor?.value) {
			return descriptor.value;
		}

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
