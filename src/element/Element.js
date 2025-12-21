/**
 * Base class for all elements
 */

import symbols from "../util/symbols.js";
import members from "./members.js";
import makeExtensible, { addPlugin } from "../extensible.js"

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
