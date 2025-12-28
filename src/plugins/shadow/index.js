/**
 * Provide access to an element's shadow root through a symbol property (even when it’s closed)
 */

import { symbols, getSuperMethod } from "../base.js";
import { defineLazyProperty } from "../../util/lazy.js";
import { getOwnValue } from "../../util/get-own-value.js";

const { shadowRoot } = symbols.known;

function attachShadow (options) {
	let existing = getOwnValue(this, shadowRoot) ?? getOwnValue(this, "shadowRoot");
	if (existing) {
		return existing;
	}

	// If the plugin is installed on a superclass, super.attachShadow will be the same function
	// We want the attachShadow that sits above it
	const _attachShadow = getSuperMethod(this, attachShadow);

	if (_attachShadow === undefined) {
		// Not supported
		return this[shadowRoot] = null;
	}

	try {
		this[shadowRoot] = _attachShadow.call(this, options);
		this.constructor.hooks.run("shadow-attached", {context: this, shadowRoot});
	}
	catch (error) {
		this[shadowRoot] = null;
	}

	return this[shadowRoot];
}

const provides = {
	attachShadow,
};

defineLazyProperty(provides, shadowRoot, {
	get () {
		return this.attachShadow();
	},
	configurable: true,
	writable: true,
});

export default {provides};
