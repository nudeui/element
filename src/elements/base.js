/**
 * Provide easy access to certain shadow and light DOM elements
 * TODO update references when DOM changes
 */

import symbols from "../util/symbols.js";
import { defineLazyProperty } from "../util/lazy.js";
import shadowPlugin from "../shadow/base.js";

const { shadowRoot, elements } = symbols.known;

export const dependencies = [shadowPlugin];

function getElement (host, options) {
	let { selector, light, multiple } = options;
	let root = light ? host : host[shadowRoot];

	if (multiple) {
		return Array.from(root.querySelectorAll(selector));
	}
	else {
		return root.querySelector(selector);
	}
}

export const hooks = {
	connected () {
		if (!this[elements]) {
			return;
		}

		// Ensure fresh references
		for (let name in this[elements]) {
			this[name] = getElement(this, this.constructor[elements][name]);
		}
	},
};

export const providesStatic = {
	defineElements (def = this[elements] ?? this.elements) {
		if (!def) {
			return;
		}

		if (!this[elements]) {
			this[elements] = {};
			defineLazyProperty(this.prototype, elements, {
				value: {}, // mainly to ensure the getter doesn't get overwritten on the prototype
				get () {
					let ret = {};
					for (let name in this.constructor[elements]) {
						defineLazyProperty(ret, name, {
							get () {
								return getElement(this, this.constructor[elements][name]);
							},
						});
					}
					return ret;
				},
				configurable: true,
				enumerable: true,
			});
		}

		for (let [name, options] of Object.entries(def)) {
			if (typeof options === "string") {
				options = { selector: options };
			}

			this[elements][name] = options;
		}
	},
};

export default { dependencies, hooks, providesStatic };
