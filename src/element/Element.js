/**
 * NudeElement base class with no plugins
 * Why not just use mixin.js and do export default getElement()? For better stack traces when debugging.
 */

import { symbols, addPlugin, makeExtensible } from "../plugins/index.js";
import members from "./members.js";

export default class NudeElement extends HTMLElement {
	constructor () {
		super();
		this.constructed();
	}

	static symbols = symbols.known;

	static {
		makeExtensible(this);
		addPlugin(this, members);
	}
}
