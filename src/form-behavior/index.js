import * as base from "./base.js";
import * as like from "./like.js";
import * as delegate from "./delegate.js";

export function setup () {
	this.addPlugin(base);
	this.addPlugin(like);
	this.addPlugin(delegate);
}
