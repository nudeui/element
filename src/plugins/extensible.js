/**
 * The plugin that makes a class support plugins
 * So meta!
 */

import Hooks from "./hooks.js";
import { hasPlugin, addPlugin } from "./plugins.js";
import { getSuper } from "./util/super.js";
import { defineOwnProperties } from "./util/own.js";

export const providesStatic = {
	/**
	 * Code initializing the class that needs to be called as soon as possible after class definition
	 * And needs to be called separately per subclass
	 * @returns {void}
	 */
	setup () {
		// TODO what about plugins that were added after setup was called?
		if (!this.hooks.hasRun("setup")) {
			// Install any plugins in Class.plugins
			for (let plugin of this.plugins) {
				addPlugin(this, plugin);
			}

			this.hooks.run("setup", this);
		}
	},
};

defineOwnProperties(providesStatic, {
	hooks: {
		init () {
			let ret = new Hooks();
			ret.parent = getSuper(this)?.hooks;
			return ret;
		},
	},
	plugins: {
		init () {
			return [];
		},
	},
})

export const plugin = { providesStatic };

export default function makeExtensible (Class) {
	return addPlugin(Class, plugin);
}

// This means the default export is also a plugin
Object.assign(makeExtensible, plugin);

export { hasPlugin, addPlugin };
