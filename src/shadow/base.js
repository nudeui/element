/**
 * Provide access to an element's shadow root through a symbol property (even when it’s closed)
 */

import symbols from "../util/symbols.js";
import { defineLazyProperty } from "../util/lazy.js";

const { shadowRoot, shadowRootOptions } = symbols.known;
const { attachShadow } = HTMLElement.prototype;

export const members = {
	attachShadow (options = this.constructor[shadowRootOptions] ?? this.constructor.shadowRoot) {
		if (this[shadowRoot] !== undefined) { // We want to include null
			return this[shadowRoot];
		}

		if (attachShadow === undefined) {
			// Not supported
			return this[shadowRoot] = null;
		}

		this[shadowRootOptions] ??= options;

		try {
			this[shadowRoot] = attachShadow.call(this, options);
			this.hooks.run("shadow-attached", {context: this, shadowRoot});
		}
		catch (error) {
			this[shadowRoot] = null;
		}

		return this[shadowRoot];
	},
};

defineLazyProperty(members, shadowRoot, {
	get () {
		return this.attachShadow();
	},
	configurable: true,
	writable: true,
});

export default {members};
