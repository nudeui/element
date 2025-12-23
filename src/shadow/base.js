/**
 * Provide access to an element's shadow root through a symbol property (even when it’s closed)
 */

import { defineLazyProperty, symbols, getSuper } from "../plugins/index.js";

const { shadowRoot, shadowRootOptions } = symbols.known;

/**
 * Get the own value of a property (if one exists) without triggering any getters
 * @param {object} object
 * @param {string} name
 * @returns {any}
 */
function getOwnValue (object, name) {
	let descriptor = Object.getOwnPropertyDescriptor(object, name);
	return descriptor?.value;
}

export const provides = {
	attachShadow (options = this.constructor[shadowRootOptions] ?? this.constructor.shadowRoot) {
		if (getOwnValue(this, shadowRoot)) {
			return this[shadowRoot];
		}
		if (getOwnValue(this, "shadowRoot")) {
			return this.shadowRoot;
		}

		const _attachShadow = getSuper(this)?.attachShadow ?? HTMLElement.prototype.attachShadow;

		if (_attachShadow === undefined) {
			// Not supported
			return this[shadowRoot] = null;
		}

		this[shadowRootOptions] ??= options;

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

defineLazyProperty(provides, shadowRoot, {
	get () {
		return this.attachShadow();
	},
	configurable: true,
	writable: true,
});

export default {provides};
