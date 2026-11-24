/**
 * Provide access to an element's shadow root through a symbol property (even when it’s closed)
 */

import { symbols } from "xtensible";
import { getSuperMethod } from "xtensible/util";
import { defineLazyProperty } from "../../util/lazy.js";
import { getOwnValue } from "../../util/get-own-value.js";

const { shadowRoot } = symbols.known;

// A `shadowRoot` override may read the symbol and re-enter attachShadow(), so the plugin reads the native getter
const { get: getShadowRoot } = Object.getOwnPropertyDescriptor(Element.prototype, "shadowRoot");

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
			// Reuse a declarative root, because the native attachShadow() would empty it.
			// Another mode goes to the native call, which throws, as without the plugin.
			// No options means the lazy symbol, which takes the root as is.
			// FIXME: a closed declarative root is visible only through ElementInternals, so `{ mode: "closed" }` still empties it
			existing = getShadowRoot.call(this);
			let reuse = existing && (!options || options.mode === existing.mode);
			this[shadowRoot] = reuse ? existing : _attachShadow.call(this, options);
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
