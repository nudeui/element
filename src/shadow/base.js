/**
 * Provide access to an element's shadow root through a symbol property (even when it’s closed)
 */

import { defineOwnProperty, symbols, getSuperMember } from "../plugins/index.js";
import { getOwnValue } from "../util/get-own-value.js";

const { shadowRoot } = symbols.known;

export const provides = {
	attachShadow (options) {
		let existing = getOwnValue(this, shadowRoot) ?? getOwnValue(this, "shadowRoot");
		if (existing) {
			return existing;
		}

		// If the plugin is installed on a superclass, super.attachShadow will be the same function
		// We want the attachShadow that sits above it
		const _attachShadow = getSuperMember(this, "attachShadow")?.value;

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
	},
};

defineOwnProperty(provides, shadowRoot, {
	get () {
		return this.attachShadow();
	},
	configurable: true,
	writable: true,
});

export default {provides};
