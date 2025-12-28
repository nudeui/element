/**
 * NudeElement base class with no plugins
 * Why not just use mixin.js and do export default getElement()? For better stack traces when debugging.
 */

import extensible, { symbols, addPlugins } from "../plugins/base.js";
import members from "./members.js";

export default class NudeElement extends HTMLElement {
	constructor () {
		super();
		this.constructed();
	}

	static symbols = symbols.known;

	static {
		addPlugins(this, extensible, members);
	}
}
