/**
 * Base class for all elements
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
