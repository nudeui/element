/**
 * Provide access to element internals through a symbol property
 */

import symbols from "../util/symbols.js";
import { defineLazyProperty } from "../util/lazy.js";

const { internals } = symbols.known;
const { attachInternals } = HTMLElement.prototype;

export const members = {
	attachInternals () {
		if (this[internals] !== undefined) {
			return this[internals];
		}

		if (attachInternals === undefined) {
			// Not supported
			return this[internals] = null;
		}

		try {
			return this[internals] = attachInternals.call(this);
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
