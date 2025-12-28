/**
 * Factory for NudeElement base classes with custom params
 */

import extensible, { symbols, addPlugins } from "../plugins/base.js";
import members from "./members.js";

export default (Super = HTMLElement, plugins = []) => class NudeElement extends Super {
	constructor () {
		super();
		this.constructed();
	}

	static symbols = symbols.known;

	static {
		addPlugins(this, extensible, members, plugins);
	}
};
