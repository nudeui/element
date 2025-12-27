/**
 * Provide access to element internals through a symbol property
 */

import { symbols, getSuper } from "../plugins/index.js";
import { defineLazyProperty } from "../util/lazy.js";
import { getOwnValue } from "../util/get-own-value.js";

const { internals } = symbols.known;

function attachInternals () {
	let existing = getOwnValue(this, internals);
	if (existing !== undefined) {
		return existing;
	}

	// If the plugin is installed on a superclass, super.attachInternals will be the same function
	// We want the attachInternals that sits above it
	const _attachInternals = getSuper(this, C => Object.hasOwn(C, "attachInternals") && C.attachInternals !== attachInternals)?.attachInternals;

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
}

export const provides = {
	attachInternals,
};

defineLazyProperty(provides, internals, {
	get () {
		return this.attachInternals();
	},
	configurable: true,
	writable: true,
});

export default {provides};
