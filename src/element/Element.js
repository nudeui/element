/**
 * Base class for all elements
 */

import members from "./members.js";
import makeExtensible, { addPlugin } from "../extensible.js"

export default class NudeElement extends HTMLElement {
	constructor () {
		super();
		this.constructed();
	}
}

makeExtensible(NudeElement);
addPlugin(NudeElement, members);
