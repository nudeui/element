/**
 * The plugin that makes a class support plugins
 * So meta!
 */

import Hooks from "./hooks.js";
import { hasPlugin, addPlugin } from "./plugins.js";
import { getSuper } from "./util/super.js";
import symbols from "./symbols.js";

const { hooks, plugins } = symbols.new;

export const provides = {
	/**
	 * Like super, but dynamic
	 */
	get super () {
		return getSuper(this);
	},
};

export const providesStatic = {
	/**
	 * Like super, but dynamic
	 */
	get super () {
		return getSuper(this);
	},

	get hooks () {
		if (!Object.hasOwn(this, hooks)) {
			this[hooks] = new Hooks();
			this[hooks].parent = this.super?.hooks;
		}

		return this[hooks];
	},
	set hooks (value) {
		this[hooks] = value;
	},

	/** Plugins to install */
	get plugins () {
		if (!Object.hasOwn(this, plugins)) {
			this[plugins] = [];
		}

		return this[plugins];
	},
	set plugins (value) {
		this[plugins] = value;
	},

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

export const plugin = { provides, providesStatic };

export default function makeExtensible (Class) {
	return addPlugin(Class, plugin);
}

// This means the default export is also a plugin
Object.assign(makeExtensible, plugin);

export { hasPlugin, addPlugin };
