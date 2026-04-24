/**
 * NudeElement base class with no plugins
 * Why not just use mixin.js and do export default getElement()? For better stack traces when debugging.
 */

import { symbols, addPlugins } from "xtensible";
import { api, $hook, hooksCommon } from "xtensible/plugins";
import members from "./members.js";

export default class NudeElement extends HTMLElement {
	constructor () {
		super();
		this.constructed();
	}

	static symbols = symbols;

	static {
		addPlugins(this, api, $hook, hooksCommon, members);
	}
}
