/**
 * The plugin that makes a class support plugins
 * So meta!
 */

import Hooks from "../hooks.js";
import { getSuper, getSuperMethod } from "../util/super.js";
import { defineOwnProperty } from "../util/own.js";

const providesStatic = {
	/**
	 * Code initializing the class that needs to be called as soon as possible after class definition
	 * And needs to be called separately per subclass
	 * @returns {void}
	 */
	setup () {
		// super.setup()
		getSuperMethod(this, providesStatic.setup)?.call(this);

		// TODO what about plugins that were added after setup was called?
		if (!this.hooks.hasRun("setup")) {
			this.hooks.run("setup", this);
		}
	},
};

defineOwnProperty(providesStatic, "hooks", function init () {
	let ret = new Hooks();
	ret.parent = getSuper(this)?.hooks;
	return ret;
});

export const base = { providesStatic };
export default base;

export * from "../plugins.js";
export * from "../util/own.js";
export * from "../util/super.js";
export { default as symbols } from "../symbols.js";
export { default as Hooks } from "../hooks.js";
