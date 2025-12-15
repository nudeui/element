/**
 * Provide access to an element's shadow root through a symbol property (even when it’s closed)
 */

import symbols from "../util/symbols.js";
import { defineLazyProperty } from "../util/lazy.js";

const { shadowRoot, shadowRootOptions } = symbols.known;
const _attachShadow = HTMLElement.prototype.attachShadow;

export const provides = {
	attachShadow (options = this.constructor[shadowRootOptions] ?? this.constructor.shadowRoot) {
		let descriptor = Object.getOwnPropertyDescriptor(this, shadowRoot);
		if (descriptor?.value) {
			return descriptor.value;
		}

		if (_attachShadow === undefined) {
			// Not supported
			return this[shadowRoot] = null;
		}

		this[shadowRootOptions] ??= options;

		try {
			this[shadowRoot] = _attachShadow.call(this, options);
			this.hooks.run("shadow-attached", {context: this, shadowRoot});
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

export default {provides};
