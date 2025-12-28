/**
 * The plugin that makes a class support plugins
 * So meta!
 */

import Hooks from "./hooks.js";
import { hasPlugin, addPlugin } from "./plugins.js";
import { getSuper } from "./util/super.js";
import { defineOwnProperty } from "./util/own.js";

const providesStatic = {
	/**
	 * Code initializing the class that needs to be called as soon as possible after class definition
	 * And needs to be called separately per subclass
	 * @returns {void}
	 */
	setup () {
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

export const plugin = { providesStatic };

export default function makeExtensible (Class) {
	return addPlugin(Class, plugin);
}

// This means the default export is also a plugin
Object.assign(makeExtensible, plugin);

export { hasPlugin, addPlugin };
