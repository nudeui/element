/**
 * Provide access to an element's shadow root through a symbol property (even when it’s closed)
 */

import { symbols } from "xtensible";
import { getSuperMethod } from "xtensible/util";
import { defineLazyProperty } from "../../util/lazy.js";
import { getOwnValue } from "../../util/get-own-value.js";

const { shadowRoot } = symbols.known;

const provides = {
	attachShadow (options) {
		let existing = getOwnValue(this, shadowRoot) ?? getOwnValue(this, "shadowRoot");
		if (existing) {
			return existing;
		}

		// If the plugin is installed on a superclass, super.attachShadow will be the same function
		// We want the attachShadow that sits above it
		const _attachShadow = getSuperMethod(this, provides.attachShadow);

		if (_attachShadow === undefined) {
			// Not supported
			return (this[shadowRoot] = null);
		}

		try {
			this[shadowRoot] = _attachShadow.call(this, options);
			this.$hook("shadow-attached", { shadowRoot });
		}
		catch (error) {
			this[shadowRoot] = null;
		}

		return this[shadowRoot];
	},
};

defineLazyProperty(provides, shadowRoot, {
	get () {
		return this.attachShadow();
	},
	configurable: true,
	writable: true,
});

export default { provides };
