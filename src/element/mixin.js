/**
 * Factory for NudeElement base classes with custom params
 */

import { symbols, addPlugin, addPlugins, makeExtensible } from "../plugins/index.js";
import members from "./members.js";

export default (Super = HTMLElement, plugins = []) => class NudeElement extends Super {
	constructor () {
		super();
		this.constructed();
	}

	static symbols = symbols.known;

	static {
		makeExtensible(this);
		addPlugin(this, members);

		if (plugins?.length > 0) {
			addPlugins(this, plugins);
		}
	}
}
