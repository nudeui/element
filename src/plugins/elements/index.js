/**
 * Provide easy access to certain shadow and light DOM elements
 * TODO update references when DOM changes
 */

import { symbols } from "xtensible";
import { defineOwnProperty } from "xtensible/util";
import shadowPlugin from "../shadow/index.js";

const { shadowRoot, elements } = symbols.known;

const dependencies = [shadowPlugin];

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

const hooks = {
	setup () {
		if (Object.hasOwn(this, "elements")) {
			this.defineElements();
		}
	},

	connected () {
		let def = this.constructor[elements];

		// Ensure fresh references
		for (let name in def) {
			this[name] = getElement(this, def[name]);
		}
	},
};

const providesStatic = {
	defineElements (def = this.elements) {
		if (!def) {
			return;
		}

		for (let [name, options] of Object.entries(def)) {
			if (typeof options === "string") {
				options = { selector: options };
			}

			this[elements][name] = options;
		}
	},
};

defineOwnProperty(providesStatic, elements, () => ({}));

export default { dependencies, hooks, providesStatic };
