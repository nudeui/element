/**
 * Factory for NudeElement base classes with custom params
 */

import extensible, { symbols, addPlugins } from "../extensible.js";
import members from "./members.js";

/**
 * Create a custom NudeElement base class
 * @param {HTMLElement | FunctionConstructor extends HTMLElement} [Super=HTMLElement] - The superclass to extend
 * @param {Plugin[]} [plugins=[]] - Any plugins to add to the class
 * @returns {FunctionConstructor} The NudeElement base class created
 */
export default function (Super = HTMLElement, plugins = []) {
	if (Array.isArray(Super)) {
		// Only plugins provided
		[Super, plugins] = [HTMLElement, Super];
	}

	return class NudeElement extends Super {
		constructor () {
			super();
			this.constructed();
		}

		static symbols = symbols.known;

		static {
			addPlugins(this, extensible, members, plugins);
		}
	};
}
