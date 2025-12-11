/**
 * Provide access to element internals through a symbol property
 */

import symbols from "../util/symbols.js";
import { defineLazyProperty } from "../util/lazy.js";

const { internals } = symbols.known;
const _attachInternals = HTMLElement.prototype.attachInternals;

export const members = {
	attachInternals () {
		if (this[internals] !== undefined) {
			return this[internals];
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

defineLazyProperty(members, internals, {
	get () {
		return this.attachInternals();
	},
	configurable: true,
	writable: true,
});

export default {members};
